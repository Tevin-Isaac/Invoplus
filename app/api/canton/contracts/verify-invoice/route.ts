/**
 * POST /api/canton/contracts/verify-invoice
 *
 * Platform exercises InvoiceContract.VerifyInvoice on Canton.
 * Runs the InvoPlus risk engine to compute score/grade, then
 * writes the result permanently on-chain in the InvoiceContract.
 *
 * Only the platform party can call this — enforced by Daml.
 *
 * Daml choice: InvoPlus.Invoice:InvoiceContract:VerifyInvoice
 */
import { NextResponse } from 'next/server'
import { submitAndWait } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'
import { scoreInvoice } from '@/lib/risk-engine'

export const dynamic = 'force-dynamic'

const GRADE_MAP: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const {
      platformPartyId,
      invoiceContractId,
      // Invoice details for scoring (re-scored at verify time for freshness)
      invoiceNumber,
      debtorName,
      amount,
      currency,
      issueDate,
      dueDate,
    } = await req.json()

    if (!platformPartyId || !invoiceContractId) {
      return NextResponse.json({ ok: false, error: 'platformPartyId and invoiceContractId required' }, { status: 400 })
    }

    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({
        ok: false,
        error: 'INVOPLUS_PACKAGE_ID not set. Deploy DAR via Seaport first.',
      }, { status: 503 })
    }

    // Run deterministic risk scoring
    const today = new Date().toISOString().split('T')[0]
    const risk = scoreInvoice({
      invoiceNumber: invoiceNumber ?? 'UNKNOWN',
      debtorName: debtorName ?? 'Unknown Debtor',
      amount: amount ?? 0,
      currency: currency ?? 'USD',
      issueDate: issueDate ?? today,
      dueDate: dueDate ?? today,
    })

    // Write score to Canton ledger via VerifyInvoice choice. The choice's
    // controller is the invoice's `platform` party, so when a shared platform
    // party is configured it must be the one acting — not whatever party the
    // client happens to be connected as.
    const platform = process.env.CANTON_PLATFORM_PARTY ?? platformPartyId
    const result = await submitAndWait(
      [platform],
      [platform],
      [{
        ExerciseCommand: {
          templateId: `${packageId}:InvoPlus.Invoice:InvoiceContract`,
          contractId: invoiceContractId,
          choice: 'VerifyInvoice',
          choiceArgument: {
            score: risk.score.toString(),
            grade: `Grade_${risk.grade}`,
          },
        },
      }],
    )

    return NextResponse.json({
      ok: true,
      score: risk.score,
      grade: risk.grade,
      advanceRateRange: `${(risk.advanceRateMin * 100).toFixed(0)}–${(risk.advanceRateMax * 100).toFixed(0)}%`,
      tenorDays: risk.tenorDays,
      riskFactors: risk.riskFactors,
      positiveFactors: risk.positiveFactors,
      summary: risk.summary,
      transactionId: result?.transactionId,
      // VerifyInvoice archives the old InvoiceContract and creates a new one
      // (Daml contracts are immutable) — this is that new contract's ID.
      // Callers (e.g. ListForAuction) must use this ID, not the one passed in.
      newInvoiceContractId: result?.contractId,
      newStatus: 'Verified',
      message: `Invoice verified on Canton with risk score ${risk.score}/100 (Grade ${risk.grade})`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
