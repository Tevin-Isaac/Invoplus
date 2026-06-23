import { NextResponse } from 'next/server'
import { getLedgerEnd, getPackages } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [ledgerEnd, packages] = await Promise.all([
      getLedgerEnd(),
      getPackages(),
    ])
    return NextResponse.json({
      ok: true,
      offset: ledgerEnd.offset,
      packageCount: packages.packageIds?.length ?? 0,
      network: 'Canton DevNet',
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
