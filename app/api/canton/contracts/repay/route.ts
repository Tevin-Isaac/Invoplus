/**
 * POST /api/canton/contracts/repay
 *
 * Creates a RepaymentRequest on Canton after the seller collects from the debtor.
 * Platform then approves and completes the repayment, creating a RepaymentConfirmation.
 *
 * Two-step flow:
 *   1. Seller calls this route → creates RepaymentRequest (status: Pending)
 *   2. Platform approves → status: Approved → CompleteRepayment → RepaymentConfirmation
 *
 * In a production integration, step 2 would be triggered by a Canton Coin transfer event.
 *
 * Daml template: InvoPlus.Repayment:RepaymentRequest
 */
import { NextResponse } from 'next/server'
import { submitAndWait } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const {
      sellerPartyId,
      financierPartyId,
      platformPartyId,
      invoiceId,
      fundedAmount,
      annualRate,
      tenorDays,
      currency,
    } = await req.json()

    if (!sellerPartyId || !financierPartyId || !invoiceId || !fundedAmount || !annualRate) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    const packageId = process.env.INVOPLUS_PACKAGE_ID
    if (!packageId) {
      return NextResponse.json({ ok: false, error: 'INVOPLUS_PACKAGE_ID not set' }, { status: 503 })
    }

    // Calculate yield: principal × annual rate × (tenor / 365)
    const yieldAmount = Math.round(fundedAmount * annualRate * ((tenorDays ?? 90) / 365) * 100) / 100
    const totalDue = Math.round((fundedAmount + yieldAmount) * 100) / 100
    const now = new Date().toISOString()

    const result = await submitAndWait(
      [sellerPartyId],
      [financierPartyId, process.env.CANTON_PLATFORM_PARTY ?? platformPartyId ?? sellerPartyId],
      [{
        CreateCommand: {
          templateId: `${packageId}:InvoPlus.Repayment:RepaymentRequest`,
          createArguments: {
            seller:       sellerPartyId,
            financier:    financierPartyId,
            platform:     process.env.CANTON_PLATFORM_PARTY ?? platformPartyId ?? sellerPartyId,
            invoiceId,
            fundedAmount: fundedAmount.toString(),
            yieldAmount:  yieldAmount.toString(),
            totalDue:     totalDue.toString(),
            currency:     currency ?? 'USD',
            debtorPaidAt: now,
            requestedAt:  now,
            status:       'Pending',
          },
        },
      }],
    )

    return NextResponse.json({
      ok: true,
      fundedAmount,
      yieldAmount,
      totalDue,
      currency: currency ?? 'USD',
      transactionId: result?.transactionId,
      message: `RepaymentRequest created on Canton. Total due to financier: ${currency ?? 'USD'} ${totalDue.toLocaleString()} (principal ${fundedAmount.toLocaleString()} + yield ${yieldAmount.toLocaleString()})`,
      nextStep: 'Platform must call ApproveRepayment then CompleteRepayment to finalise.',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
