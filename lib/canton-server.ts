/**
 * Server-side Canton ledger client using @c7-digital/ledger SDK.
 * Token is fetched via OIDC client-credentials and cached for 8h (ledger TTL).
 * All methods here run server-side only (Next.js API routes / Server Components).
 */
import { TypedHttpClient } from '@c7-digital/ledger'

const AUTH_URL     = process.env.CANTON_AUTH_URL!
const CLIENT_ID    = process.env.CANTON_CLIENT_ID!
const CLIENT_SECRET = process.env.CANTON_CLIENT_SECRET!
const LEDGER_URL   = process.env.CANTON_LEDGER_URL!

// ─── Auth token cache ────────────────────────────────────────────────────────

let cachedToken: { token: string; expiresAt: number } | null = null

export async function getCantonToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token
  }

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience:      'validator-devnet-m2m',
      scope:         'daml_ledger_api',
    }),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Canton auth failed: ${res.status}`)

  const data = await res.json()
  cachedToken = {
    token:     data.access_token,
    // expires_in is seconds; subtract 60s safety margin
    expiresAt: now + (data.expires_in - 60) * 1000,
  }
  return cachedToken.token
}

// ─── Typed HTTP client (singleton per token) ─────────────────────────────────

let _client: TypedHttpClient | null = null
let _clientToken = ''

async function getClient(): Promise<TypedHttpClient> {
  const token = await getCantonToken()
  if (!_client || _clientToken !== token) {
    _client = new TypedHttpClient({ token, baseUrl: LEDGER_URL })
    _clientToken = token
  }
  return _client
}

// ─── Ledger helpers ──────────────────────────────────────────────────────────

export async function getLedgerEnd() {
  const client = await getClient()
  return client.getLedgerEnd()
}

export async function getParties() {
  const client = await getClient()
  return client.getParties()
}

export async function allocateParty(displayName: string, partyIdHint: string) {
  const token = await getCantonToken()
  const res = await fetch(`${LEDGER_URL}/v2/parties`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyIdHint, displayName, localMetadata: { annotations: {} } }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`allocateParty failed: ${res.status}`)
  return res.json()
}

export async function createUser(userId: string, primaryParty: string) {
  const token = await getCantonToken()
  const res = await fetch(`${LEDGER_URL}/v2/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: { id: userId, primaryParty, isDeactivated: false },
      rights: [
        { kind: { CanActAs: { party: primaryParty } } },
        { kind: { CanReadAs: { party: primaryParty } } },
      ],
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`createUser failed: ${res.status}`)
  return res.json()
}

export async function getConnectedSynchronizers() {
  const token = await getCantonToken()
  const res = await fetch(`${LEDGER_URL}/v2/state/connected-synchronizers`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) return { connectedSynchronizers: [] }
  return res.json()
}

// ─── Package / DAR helpers (raw fetch — TypedHttpClient doesn't expose these) ─

export async function getPackages() {
  const token = await getCantonToken()
  const res = await fetch(`${LEDGER_URL}/v2/packages`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GET /v2/packages failed: ${res.status}`)
  return res.json()
}

export async function getUsers() {
  const token = await getCantonToken()
  const res = await fetch(`${LEDGER_URL}/v2/users`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GET /v2/users failed: ${res.status}`)
  return res.json()
}

// ─── ACS query ───────────────────────────────────────────────────────────────
// Queries the Active Contract Set for given parties + optional template filter.
// templateIds format: "packageId:ModuleName:TemplateName"
// Uses raw fetch because TypedHttpClient's queryActiveContracts has strict branded types.

export async function queryACS(parties: string[], templateIds?: string[]) {
  const token = await getCantonToken()

  const filtersByParty: Record<string, unknown> = {}
  for (const p of parties) {
    if (templateIds?.length) {
      filtersByParty[p] = {
        cumulative: templateIds.map(id => {
          const parts = id.split(':')
          return {
            templateIds: [{
              packageId: parts[0],
              moduleName: parts[1],
              entityName: parts[2],
            }],
          }
        }),
      }
    } else {
      filtersByParty[p] = { cumulative: [] }
    }
  }

  const res = await fetch(`${LEDGER_URL}/v2/state/active-contracts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filter: { filtersByParty } }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ACS query failed ${res.status}: ${text}`)
  }

  // ACS returns newline-delimited JSON (NDJSON)
  const text = await res.text()
  return text
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line) } catch { return null } })
    .filter(Boolean)
}

// ─── Submit a command and wait for completion ─────────────────────────────────

export async function submitAndWait(
  actAs: string[],
  readAs: string[],
  commands: unknown[],
) {
  const token = await getCantonToken()
  const res = await fetch(`${LEDGER_URL}/v2/commands/submit-and-wait`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      actAs,
      readAs,
      commands,
      workflowId: `invoplus-${Date.now()}`,
      applicationId: 'invoplus',
      commandId: `cmd-${Date.now()}`,
    }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`submitAndWait failed ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── WebSocket config (consumed by client-side code) ─────────────────────────

export async function getWebSocketConfig() {
  const token = await getCantonToken()
  return {
    token,
    wsBaseUrl: process.env.CANTON_WS_URL!,
  }
}
