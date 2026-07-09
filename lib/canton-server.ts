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

/**
 * Grant the M2M user (the identity all our server-side commands run as —
 * its ledger user id is the token's `sub` claim) CanActAs/CanReadAs on a
 * party. Without this, commands submitted on behalf of a freshly allocated
 * party fail with a permission error: allocation alone does NOT link the
 * party to the submitting user.
 */
export async function grantM2MRights(party: string) {
  const token = await getCantonToken()
  const userId = String(JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub)
  const res = await fetch(`${LEDGER_URL}/v2/users/${userId}/rights`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      // Note the extra `value` nesting — the v2 JSON API wraps each right's
      // oneof payload, unlike the flatter shape /v2/users accepts on create.
      // CanActAs only: acting as a party implies reading as it, and the
      // shared M2M user has a hard 1000-rights cap on this validator
      // (TOO_MANY_USER_RIGHTS) — granting both per party burned 2 slots
      // per connect for no benefit.
      rights: [
        { kind: { CanActAs: { value: { party } } } },
      ],
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`grantM2MRights failed: ${res.status} ${await res.text().catch(() => '')}`)
  return res.json()
}

export async function createUser(userId: string, primaryParty: string) {
  const token = await getCantonToken()
  const res = await fetch(`${LEDGER_URL}/v2/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: { id: userId, primaryParty, isDeactivated: false },
      // Same extra `value` nesting as grantM2MRights' rights payload — this
      // was missing here, so every createUser call since day one has 400'd
      // with "Missing required field at 'value'" and been silently
      // swallowed by provision-party's best-effort try/catch. Confirmed
      // fixed against the live validator: the flat shape 400s, this shape
      // succeeds.
      rights: [
        { kind: { CanActAs: { value: { party: primaryParty } } } },
        { kind: { CanReadAs: { value: { party: primaryParty } } } },
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
//
// Two things about this endpoint are easy to get wrong (both were wrong here originally):
//   1. An empty `cumulative: []` filter matches NOTHING, not "all templates" — you need an
//      explicit `identifierFilter: { WildcardFilter: {...} }` entry to mean "all templates".
//      A specific template needs `identifierFilter: { TemplateFilter: { value: { templateId, ... } } }`
//      with templateId as a single "pkgId:Module:Entity" string, not a {packageId,moduleName,entityName} object.
//   2. The endpoint requires `activeAtOffset` explicitly — omitting it does not default to
//      ledger end, so queries silently return an empty result set.

async function getLedgerEndOffset(token: string): Promise<number> {
  const res = await fetch(`${LEDGER_URL}/v2/state/ledger-end`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GET /v2/state/ledger-end failed: ${res.status}`)
  const data = await res.json()
  return data.offset
}

// Canton's TemplateFilter wants a package-name reference ("#invoplus:Module:Entity"),
// not the raw package-id hash — passing the hash directly errors with
// "expected a package name" (or silently mis-filters). Callers build filter
// strings as "<packageId>:Module:Entity" (matching the command-submission
// format), so rewrite the package-id segment to "#invoplus" here.
const PACKAGE_NAME = 'invoplus'

function toPackageNameRef(templateId: string): string {
  const parts = templateId.split(':')
  return [`#${PACKAGE_NAME}`, ...parts.slice(1)].join(':')
}

export async function queryACS(parties: string[], templateIds?: string[]) {
  const token = await getCantonToken()
  const activeAtOffset = await getLedgerEndOffset(token)

  const cumulative = templateIds?.length
    ? templateIds.map(templateId => ({
        identifierFilter: { TemplateFilter: { value: { templateId: toPackageNameRef(templateId), includeCreatedEventBlob: false } } },
      }))
    : [{ identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }]

  const filtersByParty: Record<string, unknown> = {}
  for (const p of parties) {
    filtersByParty[p] = { cumulative }
  }

  const res = await fetch(`${LEDGER_URL}/v2/state/active-contracts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filter: { filtersByParty }, verbose: true, activeAtOffset }),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`ACS query failed ${res.status}: ${text}`)
  }

  const text = await res.text()
  if (!text.trim()) return []

  // The endpoint returns a single JSON array in practice, but fall back to
  // NDJSON parsing (one JSON object per line) in case a large/paginated
  // response is streamed that way.
  try {
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return text
      .split('\n')
      .filter(Boolean)
      .map(line => { try { return JSON.parse(line) } catch { return null } })
      .filter(Boolean)
  }
}

// Balance has no contract key (LF 2.1 dropped key support), so every
// Transfer/Mint needs the owner's current Balance contract ID looked up by
// ACS query first. Queried as `platform` (signatory, so always a witness),
// not the owner — avoids an extra M2M-rights dependency for a read.
export async function findBalanceContractId(platformPartyId: string, ownerPartyId: string, packageId: string): Promise<string | null> {
  const lines = await queryACS([platformPartyId], [`${packageId}:InvoPlus.Token:Balance`])
  const pv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
  const matches = lines
    .filter((l: any) => l?.contractEntry?.JsActiveContract?.createdEvent)
    .map((l: any) => l.contractEntry.JsActiveContract.createdEvent)
    .filter((e: any) => pv(e.createArgument?.owner) === ownerPartyId)
  if (matches.length === 0) return null
  // Defensive: a client-side race at creation time can leave more than one
  // active Balance for the same owner (seen live, now guarded against at
  // the source in Header's chooseRole — this is the belt-and-suspenders
  // half). Picking the highest amount rather than an arbitrary/first match
  // means a stray $0 duplicate can never shadow the real balance.
  matches.sort((a: any, b: any) => Number(pv(b.createArgument?.amount) ?? 0) - Number(pv(a.createArgument?.amount) ?? 0))
  return matches[0].contractId
}

// The platform's own revenue balance (origination/servicing fees land here).
// Lazily created on first use, same pattern as a party's own Balance in
// /api/canton/contracts/balance — platform is the only signatory needed, so
// no M2M rights on anyone else are required to create it.
export async function ensurePlatformBalance(platformPartyId: string, packageId: string): Promise<string> {
  const existing = await findBalanceContractId(platformPartyId, platformPartyId, packageId)
  if (existing) return existing
  const created = await submitAndWait(
    [platformPartyId],
    [platformPartyId],
    [{
      CreateCommand: {
        templateId: `${packageId}:InvoPlus.Token:Balance`,
        createArguments: {
          platform: platformPartyId,
          owner: platformPartyId,
          amount: '0',
          currency: 'USD',
        },
      },
    }],
  )
  const cid = created?.contractId
  if (!cid) throw new Error('Failed to create platform revenue balance')
  return cid
}

// ─── Submit a command and wait for completion ─────────────────────────────────

// Uses /v2/commands/submit-and-wait-for-transaction (not the plain
// submit-and-wait endpoint) because plain submit-and-wait only returns
// { updateId, completionOffset } — no created/exercised contract IDs.
// Every choice-exercising route needs the real contract ID of what it just
// created (e.g. list-auction needs the InvoiceContract ID from create-invoice),
// so we ask for the transaction body back via transactionFormat.
export async function submitAndWait(
  actAs: string[],
  readAs: string[],
  commands: unknown[],
) {
  const allParties = Array.from(new Set([...actAs, ...readAs]))
  const filtersByParty: Record<string, unknown> = {}
  for (const p of allParties) {
    filtersByParty[p] = { cumulative: [{ identifierFilter: { WildcardFilter: { value: {} } } }] }
  }

  const attempt = async () => {
    const token = await getCantonToken()
    return fetch(`${LEDGER_URL}/v2/commands/submit-and-wait-for-transaction`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commands: {
          actAs,
          readAs,
          commands,
          workflowId: `invoplus-${Date.now()}`,
          applicationId: 'invoplus',
          commandId: `cmd-${Date.now()}`,
        },
        transactionFormat: {
          eventFormat: { filtersByParty, verbose: true },
          transactionShape: 'TRANSACTION_SHAPE_ACS_DELTA',
        },
      }),
      cache: 'no-store',
    })
  }

  let res = await attempt()

  // Self-healing: a party missing M2M CanActAs rights fails with 403 and a
  // deliberately redacted "security-sensitive error" body (Canton hides
  // the real reason). This should never require a human to notice, ask
  // for a party ID, and manually re-grant it — that doesn't scale past
  // one person watching a chat. Every party this app provisions is
  // granted rights at creation time, but a rights-cap cleanup sweep (the
  // shared 1000-rights limit on this DevNet sandbox fills from every team
  // using it, not just this app) can end up revoking a live party's
  // rights if it's swept up by a broad match. Rather than rely on nobody
  // ever writing an overly-broad cleanup again, just detect this exact
  // failure shape and self-repair: re-grant CanActAs on every acting
  // party and retry once before giving up.
  if (res.status === 403) {
    const bodyText = await res.text()
    if (bodyText.includes('security-sensitive error') || bodyText.includes('PERMISSION_DENIED')) {
      await Promise.all(actAs.map(p => grantM2MRights(p).catch(() => { /* best-effort */ })))
      res = await attempt()
    } else {
      throw new Error(`submitAndWait failed ${res.status}: ${bodyText}`)
    }
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`submitAndWait failed ${res.status}: ${text}`)
  }
  const data = await res.json()

  // Flatten events into a convenient shape for callers: pull out created/exercised
  // contract IDs so routes don't need to know the raw transaction event shape.
  const events: any[] = data?.transaction?.events ?? []
  const created = events
    .filter(e => e.CreatedEvent)
    .map(e => ({ contractId: e.CreatedEvent.contractId, templateId: e.CreatedEvent.templateId, createArgument: e.CreatedEvent.createArgument }))
  const exercised = events
    .filter(e => e.ExercisedEvent)
    .map(e => ({
      contractId: e.ExercisedEvent.contractId,
      templateId: e.ExercisedEvent.templateId,
      choice: e.ExercisedEvent.choice,
      exerciseResult: e.ExercisedEvent.exerciseResult,
    }))

  return {
    transactionId: data?.transaction?.updateId,
    completionOffset: data?.transaction?.offset,
    created,
    exercised,
    // First created contract ID — the common case for a single CreateCommand.
    contractId: created[0]?.contractId,
  }
}

// ─── WebSocket config (consumed by client-side code) ─────────────────────────

export async function getWebSocketConfig() {
  const token = await getCantonToken()
  return {
    token,
    wsBaseUrl: process.env.CANTON_WS_URL!,
  }
}
