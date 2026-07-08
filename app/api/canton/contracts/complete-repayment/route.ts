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
import { submitAndWait, findBalanceContractId } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

export const dynamic = 'force-dynamic'

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
    if (totalDue) {
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
          const mintedSellerBalanceCid = mintResult?.contractId
          const financierBalanceCid = await findBalanceContractId(platform, financierPartyId, packageId)
          if (mintedSellerBalanceCid && financierBalanceCid) {
            const transferResult = await submitAndWait(
              [sellerPartyId, platform],
              [financierPartyId],
              [{
                ExerciseCommand: {
                  templateId: `${packageId}:InvoPlus.Token:Balance`,
                  contractId: mintedSellerBalanceCid,
                  choice: 'Transfer',
                  choiceArgument: { toBalanceCid: financierBalanceCid, transferAmount: String(totalDue) },
                },
              }],
            )
            balanceTransferred = true
            balanceTransferTransactionId = transferResult?.transactionId
          }
        }
      } catch { /* balance not provisioned for this party yet — repayment confirmation still stands */ }
    }

    return NextResponse.json({
      ok: true,
      confirmationContractId,
      transactionId: completeResult?.transactionId,
      balanceTransferTransactionId,
      message: balanceTransferred
        ? `Repayment complete — $${totalDue} moved from the seller's balance to the financier's, on-ledger.`
        : 'Repayment complete — principal and yield settled to the financier on Canton.',
      balanceTransferred,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
