const LEDGER_URL = process.env.CANTON_LEDGER_URL!
const AUTH_URL = process.env.CANTON_AUTH_URL!
const CLIENT_ID = process.env.CANTON_CLIENT_ID!
const CLIENT_SECRET = process.env.CANTON_CLIENT_SECRET!

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
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      audience: 'validator-devnet-m2m',
      scope: 'daml_ledger_api',
    }),
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Canton auth failed: ${res.status}`)

  const data = await res.json()
  cachedToken = {
    token: data.access_token,
    // expires_in is in seconds (28800 = 8h)
    expiresAt: now + data.expires_in * 1000,
  }
  return cachedToken.token
}

export async function cantonGet(path: string) {
  const token = await getCantonToken()
  const res = await fetch(`${LEDGER_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canton GET ${path} failed ${res.status}: ${text}`)
  }
  return res.json()
}

export async function cantonPost(path: string, body: unknown) {
  const token = await getCantonToken()
  const res = await fetch(`${LEDGER_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Canton POST ${path} failed ${res.status}: ${text}`)
  }
  return res.json()
}

// Create a new Canton party (returns partyId)
export async function createParty(displayName: string, partyIdHint: string) {
  return cantonPost('/v2/parties', {
    partyIdHint,
    displayName,
    localMetadata: { annotations: { displayName } },
  })
}

// Allocate a user linked to a party
export async function createUser(userId: string, primaryParty: string) {
  return cantonPost('/v2/users', {
    user: {
      id: userId,
      primaryParty,
      isDeactivated: false,
    },
    rights: [
      { kind: { CanActAs: { party: primaryParty } } },
      { kind: { CanReadAs: { party: primaryParty } } },
    ],
  })
}

export async function getLedgerEnd() {
  return cantonGet('/v2/state/ledger-end')
}

export async function getUsers() {
  return cantonGet('/v2/users')
}

export async function getPackages() {
  return cantonGet('/v2/packages')
}

// Query Active Contract Set for a given party + template
export async function queryACS(parties: string[], templateIds?: string[]) {
  const token = await getCantonToken()
  const body: Record<string, unknown> = { filters: parties.map(p => ({ party: p, cumulative: [] })) }
  if (templateIds?.length) {
    body.filters = parties.map(p => ({
      party: p,
      cumulative: templateIds.map(id => ({ templateIds: [{ Identifier: id }] })),
    }))
  }

  const res = await fetch(`${LEDGER_URL}/v2/state/active-contracts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ACS query failed ${res.status}: ${text}`)
  }

  // ACS returns newline-delimited JSON stream
  const text = await res.text()
  return text
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line) } catch { return null }
    })
    .filter(Boolean)
}
