import { NextResponse } from 'next/server'
import { getLedgerEnd, getPackages, getConnectedSynchronizers } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [ledgerEnd, packages] = await Promise.all([
      getLedgerEnd(),
      getPackages(),
    ])

    let synchronizers: string[] = []
    try {
      const sync = await getConnectedSynchronizers()
      synchronizers = (sync as any).connectedSynchronizers?.map((s: any) => s.synchronizerId) ?? []
    } catch { /* optional */ }

    return NextResponse.json({
      ok: true,
      offset: ledgerEnd.offset,
      packageCount: packages.packageIds?.length ?? 0,
      synchronizers,
      network: 'Canton DevNet (FiveNorth)',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
