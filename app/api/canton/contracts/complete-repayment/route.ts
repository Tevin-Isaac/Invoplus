/**
 * POST /api/canton/contracts/complete-repayment
 *
 * Runs the full repayment chain in one call, starting from the
 * FundedInvoice contract itself:
 *   1. FundedInvoice.RepayFinancier (controller: seller) — creates the
 *      RepaymentRequest. The Daml choice computes yield as
 *      faceAmount - fundedAmount itself, so the client only needs the
 *      contract ID, not a re-derived rate/tenor calculation.
 *   2. RepaymentRequest.ApproveRepayment (controller: platform)
 *   3. RepaymentRequest.CompleteRepayment (controller: platform, financier
 *      jointly) — produces the dual-signed RepaymentConfirmation.
 *
 * In a real deployment these three steps would be separated by a real-world
 * event (debtor wires the seller, seller confirms, THEN platform approves;
 * the financier's leg would be a real Canton Coin/bank transfer completing
 * asynchronously). On this DevNet sandbox we provision every party and hold
 * M2M rights on all of them, so for the demo we chain all three Daml
 * choices back-to-back.
 *
 * Daml choices: InvoPlus.Invoice:FundedInvoice:RepayFinancier,
 *   InvoPlus.Repayment:RepaymentRequest:{ApproveRepayment,CompleteRepayment}
 */
import { NextResponse } from 'next/server'
import { submitAndWait, findBalanceContractId, queryACS, ensurePlatformBalance } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

// InvoPlus's cut: a servicing fee on the financier's yield at repayment,
// not on the seller's advance or the amount they repay — those stay exactly
// what was agreed in the sealed-bid auction. Only the split of the
// repayment between financier and platform changes.
const PLATFORM_FEE_RATE = 0.10

// Fresh ground-truth read of a party's current Balance amount — used after
// a transfer failure to tell the truth about what actually moved, since the
// mint and transfer are two separate ledger submissions and only the mint
// can succeed while the transfer still fails.
async function currentBalanceAmount(platform: string, owner: string, packageId: string): Promise<number | null> {
  const lines = await queryACS([platform], [`${packageId}:InvoPlus.Token:Balance`])
  const pv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
  const matches = lines
    .filter((l: any) => l?.contractEntry?.JsActiveContract?.createdEvent)
    .map((l: any) => l.contractEntry.JsActiveContract.createdEvent)
    .filter((e: any) => pv(e.createArgument?.owner) === owner)
  if (matches.length === 0) return null
  return Math.max(...matches.map((e: any) => Number(pv(e.createArgument?.amount) ?? 0)))
}

export const dynamic = 'force-dynamic'
// Same reasoning as settle-auction's maxDuration: three chained Daml choices
// plus two retry-guarded balance transfers can add up past the default 10s
// serverless timeout under real Canton latency.
export const maxDuration = 45

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const { sellerPartyId, financierPartyId, fundedInvoiceContractId } = await req.json()

    if (!sellerPartyId || !financierPartyId || !fundedInvoiceContractId) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }
    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({ ok: false, error: 'INVOPLUS_PACKAGE_ID not set' }, { status: 503 })
    }
    const platform = process.env.CANTON_PLATFORM_PARTY
    if (!platform) {
      return NextResponse.json({ ok: false, error: 'CANTON_PLATFORM_PARTY not set' }, { status: 503 })
    }

    const now = new Date().toISOString()

    // Step 1: seller triggers repayment on the FundedInvoice itself — the
    // choice computes yieldAmount = faceAmount - fundedAmount internally.
    const repayResult = await submitAndWait(
      [sellerPartyId],
      [financierPartyId, platform],
      [{
        ExerciseCommand: {
          templateId: `${packageId}:InvoPlus.Invoice:FundedInvoice`,
          contractId: fundedInvoiceContractId,
          choice: 'RepayFinancier',
          choiceArgument: { debtorPaidAt: now },
        },
      }],
    )
    const requestContractId = repayResult?.contractId
    if (!requestContractId) throw new Error('RepayFinancier did not return a RepaymentRequest contract ID')

    const requestEvent = (repayResult?.created ?? []).find((c: any) => c.contractId === requestContractId)
    const pv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
    const totalDue = pv(requestEvent?.createArgument?.totalDue)
    const yieldAmount = Number(pv(requestEvent?.createArgument?.yieldAmount) ?? 0)
    const platformFee = Math.round(yieldAmount * PLATFORM_FEE_RATE * 100) / 100
    const financierAmount = totalDue ? Number(totalDue) - platformFee : 0

    const requestTemplateId = `${packageId}:InvoPlus.Repayment:RepaymentRequest`

    // Step 2: platform approves.
    const approveResult = await submitAndWait(
      [platform],
      [platform],
      [{
        ExerciseCommand: {
          templateId: requestTemplateId,
          contractId: requestContractId,
          choice: 'ApproveRepayment',
          choiceArgument: {},
        },
      }],
    )
    const approvedContractId = approveResult?.contractId
    if (!approvedContractId) throw new Error('ApproveRepayment did not return a contract ID')

    // Step 3: platform + financier jointly complete (Daml's
    // `controller platform, financier` requires both act together).
    const completeResult = await submitAndWait(
      [platform, financierPartyId],
      [sellerPartyId, platform, financierPartyId],
      [{
        ExerciseCommand: {
          templateId: requestTemplateId,
          contractId: approvedContractId,
          choice: 'CompleteRepayment',
          choiceArgument: {},
        },
      }],
    )
    const confirmationContractId = (completeResult?.created ?? [])
      .find((c: any) => c.templateId.endsWith(':RepaymentConfirmation'))?.contractId
      ?? completeResult?.contractId

    // Move real value: the debtor's payment is off-ledger by definition (the
    // debtor isn't a Canton party) — mint the seller's Balance for the
    // amount they just collected, then transfer the full totalDue on to the
    // financier in the same call. This is the honest limit of any invoice
    // platform not run entirely on-chain: the *inbound* leg is attested by
    // the seller, but the *outbound* leg to the financier is a genuine,
    // atomic, ledger-verifiable Canton transfer.
    let balanceTransferred = false
    let balanceTransferTransactionId: string | undefined
    let balanceTransferError: string | undefined
    // Mint and Transfer are two separate ledger submissions, not one atomic
    // step — if Mint succeeds but Transfer fails, the seller's balance has
    // genuinely already increased even though the overall repayment hasn't
    // finished moving to the financier. Track that distinctly so the
    // response (and the UI) can tell the truth instead of collapsing both
    // into one misleading "pending" state.
    let sellerCredited = false
    let platformFeeTransactionId: string | undefined
    if (totalDue) {
      let mintedSellerBalanceCid: string | undefined
      try {
        const sellerBalanceCid = await findBalanceContractId(platform, sellerPartyId, packageId)
        if (sellerBalanceCid) {
          const mintResult = await submitAndWait(
            [platform],
            [sellerPartyId],
            [{
              ExerciseCommand: {
                templateId: `${packageId}:InvoPlus.Token:Balance`,
                contractId: sellerBalanceCid,
                choice: 'Mint',
                choiceArgument: { mintAmount: String(totalDue) },
              },
            }],
          )
          mintedSellerBalanceCid = mintResult?.contractId
          sellerCredited = !!mintedSellerBalanceCid
        } else {
          balanceTransferError = 'Balance contract not found for seller.'
        }
      } catch (err) {
        balanceTransferError = err instanceof Error ? err.message : 'Crediting the seller balance failed'
      }

      // Transfer the minted amount on to the financier (minus the platform's
      // servicing fee) — retried once with a fresh financier Balance
      // lookup, since Mint already committed and is not repeated on retry
      // (only Transfer, which is safe to retry: Canton either commits a
      // submission in full or not at all, so a failed attempt never
      // partially debits).
      let sellerRemainderCid: string | undefined
      if (mintedSellerBalanceCid) {
        for (let attempt = 0; attempt < 2 && !balanceTransferred; attempt++) {
          try {
            const financierBalanceCid = await findBalanceContractId(platform, financierPartyId, packageId)
            if (!financierBalanceCid) {
              balanceTransferError = 'Balance contract not found for financier after crediting seller balance.'
              break
            }
            const transferResult = await submitAndWait(
              [sellerPartyId, platform],
              [financierPartyId],
              [{
                ExerciseCommand: {
                  templateId: `${packageId}:InvoPlus.Token:Balance`,
                  contractId: mintedSellerBalanceCid,
                  choice: 'Transfer',
                  choiceArgument: { toBalanceCid: financierBalanceCid, transferAmount: String(financierAmount) },
                },
              }],
            )
            balanceTransferred = true
            balanceTransferTransactionId = transferResult?.transactionId
            balanceTransferError = undefined
            sellerRemainderCid = (transferResult?.created ?? []).find((c: any) => pv(c.createArgument?.owner) === sellerPartyId)?.contractId
          } catch (err) {
            balanceTransferError = err instanceof Error ? err.message : 'Balance transfer failed'
          }
        }
      }

      // Platform's servicing fee — a second transfer of the same seller
      // balance (now holding just the fee remainder after the financier
      // leg above) into platform's own revenue balance. Doesn't block
      // reporting the repayment as complete if it ultimately fails (the
      // financier has still been paid in full above), but retried — a
      // single-attempt version of this silently left a real user's fee
      // uncollected in production when the first attempt hit a transient
      // rights/network error, which is exactly the failure mode retrying
      // guards against.
      if (sellerRemainderCid && platformFee > 0) {
        for (let attempt = 0; attempt < 2 && !platformFeeTransactionId; attempt++) {
          try {
            const platformBalanceCid = await ensurePlatformBalance(platform, packageId)
            const feeResult = await submitAndWait(
              [sellerPartyId, platform],
              [platform],
              [{
                ExerciseCommand: {
                  templateId: `${packageId}:InvoPlus.Token:Balance`,
                  contractId: sellerRemainderCid,
                  choice: 'Transfer',
                  choiceArgument: { toBalanceCid: platformBalanceCid, transferAmount: String(platformFee) },
                },
              }],
            )
            platformFeeTransactionId = feeResult?.transactionId
          } catch { /* retried once; genuinely best-effort past that */ }
        }
      }
    }

    // Ground truth for the UI: read both balances back fresh rather than
    // trusting the submission outcomes alone — this is what actually lets
    // the response show "your balance is now $X" correctly even in the
    // partial-failure case above.
    const [sellerBalanceAfter, financierBalanceAfter] = await Promise.all([
      currentBalanceAmount(platform, sellerPartyId, packageId).catch(() => null),
      currentBalanceAmount(platform, financierPartyId, packageId).catch(() => null),
    ])

    return NextResponse.json({
      ok: true,
      confirmationContractId,
      transactionId: completeResult?.transactionId,
      balanceTransferTransactionId,
      balanceTransferError,
      sellerCredited,
      sellerBalanceAfter,
      financierBalanceAfter,
      totalDue,
      platformFee,
      platformFeeTransactionId,
      financierAmount,
      message: balanceTransferred
        ? `Repayment complete — $${financierAmount.toFixed(2)} moved to the financier (InvoPlus servicing fee: $${platformFee.toFixed(2)}), on-ledger.`
        : sellerCredited
          ? `Your balance was credited $${totalDue}, but sending it on to the financier didn't complete: ${balanceTransferError ?? 'unknown reason'} — contact support.`
          : `Repayment confirmed on InvoPlus, but the balance transfer did not complete: ${balanceTransferError ?? 'unknown reason'} — contact support.`,
      balanceTransferred,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
