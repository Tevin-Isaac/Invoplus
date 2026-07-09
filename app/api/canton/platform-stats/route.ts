/**
 * GET /api/canton/platform-stats
 *
 * Platform-wide business metrics — how much volume InvoPlus has moved and
 * how much revenue it's earned, aggregated across every user. Platform is a
 * signatory or observer on every template queried here, so this is a
 * legitimate, privacy-safe aggregate (same reasoning as the `scope:
 * 'platform'` option on /api/canton/contracts/list) — except we go straight
 * to queryACS here since we need sums, not just a contract list.
 *
 * Revenue model: a 10% servicing fee on the financier's yield at repayment
 * (see PLATFORM_FEE_RATE in complete-repayment/route.ts) — the seller's
 * advance and total repayment owed are never touched. Platform's own
 * Balance contract is where that fee actually lands, so its amount is the
 * ground truth for revenue collected so far (repayments completed before
 * this fee model shipped won't be reflected there, only in the estimate).
 */
import { NextResponse } from 'next/server'
import { queryACS } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const pv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
const num = (x: any) => Number(pv(x) ?? 0) || 0

export async function GET() {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const packageId = process.env.INVOPLUS_PACKAGE_ID
    const platform = process.env.CANTON_PLATFORM_PARTY
    if (!packageId || !platform) {
      return NextResponse.json({ ok: false, error: 'Platform not configured' }, { status: 503 })
    }

    const activeOf = async (templateId: string) => {
      const lines = await queryACS([platform], [`${packageId}:${templateId}`])
      return lines
        .filter((l: any) => l?.contractEntry?.JsActiveContract?.createdEvent)
        .map((l: any) => l.contractEntry.JsActiveContract.createdEvent)
    }

    const [balances, repayments, funded, auctions, invoices] = await Promise.all([
      activeOf('InvoPlus.Token:Balance'),
      activeOf('InvoPlus.Repayment:RepaymentConfirmation'),
      activeOf('InvoPlus.Invoice:FundedInvoice'),
      activeOf('InvoPlus.Invoice:Auction'),
      activeOf('InvoPlus.Invoice:InvoiceContract'),
    ])

    const platformBalanceEntry = balances
      .filter((e: any) => pv(e.createArgument?.owner) === platform)
      .sort((a: any, b: any) => num(b.createArgument?.amount) - num(a.createArgument?.amount))[0]
    const platformBalance = platformBalanceEntry ? num(platformBalanceEntry.createArgument.amount) : 0

    const uniqueOwners = new Set(balances.map((e: any) => pv(e.createArgument?.owner)).filter((o: string) => o !== platform))

    const totalYieldGenerated = repayments.reduce((s: number, e: any) => s + num(e.createArgument?.yieldAmount), 0)
    const totalVolumeRepaid = repayments.reduce((s: number, e: any) => s + num(e.createArgument?.fundedAmount), 0)
    const activeFundedVolume = funded.reduce((s: number, e: any) => s + num(e.createArgument?.fundedAmount), 0)
    const PLATFORM_FEE_RATE = 0.10
    const estimatedLifetimeRevenue = Math.round(totalYieldGenerated * PLATFORM_FEE_RATE * 100) / 100

    return NextResponse.json({
      ok: true,
      platformBalance,
      estimatedLifetimeRevenue,
      feeRate: PLATFORM_FEE_RATE,
      totalRepayments: repayments.length,
      totalVolumeRepaid,
      totalYieldGenerated,
      activeFundedPositions: funded.length,
      activeFundedVolume,
      totalFundedEver: funded.length + repayments.length,
      totalFundedVolumeEver: activeFundedVolume + totalVolumeRepaid,
      activeAuctions: auctions.filter((e: any) => !pv(e.createArgument?.settled)).length,
      totalInvoicesListed: invoices.length + auctions.length + funded.length + repayments.length,
      uniqueParties: uniqueOwners.size,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
