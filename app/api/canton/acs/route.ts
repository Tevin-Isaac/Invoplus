import { NextResponse } from 'next/server'
import { queryACS } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

// POST { parties: string[], templateIds?: string[] }
// templateIds format: "packageId:ModuleName:TemplateName"
// Once the InvoPlus DAR is deployed via Seaport, pass the actual template IDs here.
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { parties, templateIds } = body

    if (!parties || !Array.isArray(parties) || parties.length === 0) {
      return NextResponse.json({ ok: false, error: 'parties array required' }, { status: 400 })
    }

    const result = await queryACS(parties, templateIds)
    return NextResponse.json({ ok: true, contracts: result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
