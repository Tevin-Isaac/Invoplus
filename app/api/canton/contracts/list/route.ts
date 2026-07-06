/**
 * POST /api/canton/contracts/list
 *
 * Queries the Active Contract Set (ACS) for InvoPlus contracts.
 * Returns all active contracts of the requested template type for a party.
 *
 * Supported templates (set INVOPLUS_PACKAGE_ID first):
 *   - InvoiceContract   → seller's uploaded invoices
 *   - Auction           → live auctions visible to financiers
 *   - SealedBid         → a financier's own bids (private to them + platform)
 *   - FundedInvoice     → settled/funded positions
 *   - RegistryEntry     → anti-fraud registry entries
 */
import { NextResponse } from 'next/server'
import { queryACS } from '@/lib/canton-server'
import { verifyAuthCookie, authRequired } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const TEMPLATE_MAP: Record<string, string> = {
  invoice:      'InvoPlus.Invoice:InvoiceContract',
  auction:      'InvoPlus.Invoice:Auction',
  bid:          'InvoPlus.Invoice:SealedBid',
  funded:       'InvoPlus.Invoice:FundedInvoice',
  registry:     'InvoPlus.Registry:RegistryEntry',
}

export async function POST(req: Request) {
  try {
    if (authRequired() && !verifyAuthCookie()) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 })
    }
    const { parties, template } = await req.json()

    if (!parties || !Array.isArray(parties) || parties.length === 0) {
      return NextResponse.json({ ok: false, error: 'parties[] required' }, { status: 400 })
    }

    const packageId = process.env.INVOPLUS_PACKAGE_ID

    let templateIds: string[] | undefined
    if (template && packageId) {
      const templatePath = TEMPLATE_MAP[template]
      if (!templatePath) {
        return NextResponse.json({
          ok: false,
          error: `Unknown template "${template}". Valid: ${Object.keys(TEMPLATE_MAP).join(', ')}`,
        }, { status: 400 })
      }
      templateIds = [`${packageId}:${templatePath}`]
    }

    // Auctions are public marketplace listings, but on Canton a party only
    // sees contracts it's a stakeholder in — and Auction's stakeholders are
    // just seller + platform. Without this, a financier's marketplace would
    // always be empty. The shared platform party signs every auction, so
    // reading through its view exposes all listings to every user, while
    // invoices/bids/funded stay strictly per-party.
    const queryParties = template === 'auction' && process.env.CANTON_PLATFORM_PARTY
      ? [process.env.CANTON_PLATFORM_PARTY]
      : parties

    const contracts = await queryACS(queryParties, templateIds)

    // Each entry's real shape: { contractEntry: { JsActiveContract: { createdEvent: {...} } } }
    const active = contracts
      .filter((line: any) => line?.contractEntry?.JsActiveContract?.createdEvent)
      .map((line: any) => {
        const event = line.contractEntry.JsActiveContract.createdEvent
        return {
          contractId: event.contractId,
          templateId: event.templateId,
          payload: event.createArgument,
          createdAt: event.createdAt,
          signatories: event.signatories,
          observers: event.observers,
        }
      })

    return NextResponse.json({
      ok: true,
      template: template ?? 'all',
      count: active.length,
      contracts: active,
      packageId: packageId ?? null,
      note: packageId ? undefined : 'INVOPLUS_PACKAGE_ID not set — returning all contracts for parties',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
