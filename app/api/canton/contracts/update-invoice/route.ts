/**
 * POST /api/canton/contracts/update-invoice
 *
 * Daml contracts are immutable, so "edit" = archive the old
 * InvoiceContract and create the replacement in ONE atomic submission —
 * either both happen or neither does. The replacement is re-scored and
 * reset to Pending (edited numbers invalidate any previous verification).
 *
 * Authority mirrors delete-invoice: act as seller + platform so both the
 * Pending (seller-only signatory) and Verified (seller+platform) cases
 * are covered.
 */
import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { submitAndWait } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'
import { scoreInvoice } from '@/lib/risk-engine'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const {
      sellerPartyId,
      invoiceContractId,   // the contract being replaced
      invoiceId,
      debtorName,
      debtorTaxId,
      faceAmount,
      currency,
      issueDate,
      dueDate,
    } = await req.json()

    if (!sellerPartyId || !invoiceContractId || !invoiceId || !debtorName || !faceAmount || !dueDate) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }
    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({ ok: false, error: 'INVOPLUS_PACKAGE_ID not set' }, { status: 503 })
    }

    const platform = process.env.CANTON_PLATFORM_PARTY ?? sellerPartyId
    const today = new Date().toISOString().split('T')[0]

    // Same optional-tax-ID handling as create-invoice: deterministic
    // reference derived from the invoice itself when absent/short, so the
    // anti-double-financing hash stays stable across retries.
    const providedTaxId = String(debtorTaxId ?? '').trim()
    const autoRef = 'REF-' + createHash('sha256').update(`${invoiceId}|${debtorName}`).digest('hex').slice(0, 12).toUpperCase()
    const effectiveTaxId = providedTaxId.length >= 8 ? providedTaxId
      : providedTaxId.length > 0 ? `${providedTaxId}-${autoRef.slice(4, 4 + (8 - providedTaxId.length) + 3)}`
      : autoRef

    const risk = scoreInvoice({
      invoiceNumber: invoiceId,
      debtorName,
      amount: faceAmount,
      currency: currency ?? 'USD',
      issueDate: issueDate ?? today,
      dueDate,
    })
    const invoiceHash = `hash:${invoiceId}:${effectiveTaxId}:${faceAmount}`
    const docHash = 'sha256:' + createHash('sha256')
      .update(`${invoiceId}|${debtorName}|${effectiveTaxId}|${faceAmount}|${dueDate}`)
      .digest('hex')

    const templateId = `${packageId}:InvoPlus.Invoice:InvoiceContract`
    const result = await submitAndWait(
      [sellerPartyId, platform],
      [sellerPartyId, platform],
      [
        {
          ExerciseCommand: {
            templateId,
            contractId: invoiceContractId,
            choice: 'Archive',
            choiceArgument: {},
          },
        },
        {
          CreateCommand: {
            templateId,
            createArguments: {
              seller: sellerPartyId,
              platform,
              invoiceId,
              debtorName,
              debtorTaxId: effectiveTaxId,
              faceAmount: faceAmount.toString(),
              currency: currency ?? 'USD',
              issueDate: issueDate ?? today,
              dueDate,
              docHash,
              invoiceHash,
              aiScore: risk.score.toString(),
              riskGrade: `Grade_${risk.grade}`,
              status: 'Pending',
              uploadedAt: new Date().toISOString(),
            },
          },
        },
      ],
    )

    return NextResponse.json({
      ok: true,
      contractId: result?.contractId ?? 'unknown',
      invoiceId,
      invoiceHash,
      riskScore: risk.score,
      riskGrade: risk.grade,
      advanceRateRange: `${(risk.advanceRateMin * 100).toFixed(0)}–${(risk.advanceRateMax * 100).toFixed(0)}%`,
      tenorDays: risk.tenorDays,
      summary: risk.summary,
      riskFactors: risk.riskFactors,
      positiveFactors: risk.positiveFactors,
      cantonTemplateId: templateId,
      transactionId: result?.transactionId,
      message: 'Invoice updated — old contract archived and replacement created atomically.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
