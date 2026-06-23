import { NextResponse } from 'next/server'
import { getWebSocketConfig } from '@/lib/canton-server'

export const dynamic = 'force-dynamic'

// Returns a short-lived WS config for the client to open its own WebSocket.
// The client uses @c7-digital/ledger's WebSocketClient with these credentials.
export async function GET() {
  try {
    const config = await getWebSocketConfig()
    return NextResponse.json({ ok: true, ...config })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
