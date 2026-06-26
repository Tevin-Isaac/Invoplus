import { hash } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { submitAndWait, queryACS, allocateParty } from '@/lib/canton-server'

// ─── Config ──────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'
const BCRYPT_ROUNDS = 12

// These come from the Seaport deploy. Until they are set, ledger-backed auth
// returns a clear error instead of silently failing.
function platformParty(): string {
  const p = process.env.CANTON_PLATFORM_PARTY
  if (!p) throw new Error('CANTON_PLATFORM_PARTY not set. Allocate the platform party and set it after the Seaport deploy.')
  return p
}
function packageId(): string {
  const p = process.env.INVOPLUS_PACKAGE_ID
  if (!p) throw new Error('INVOPLUS_PACKAGE_ID not set. Deploy the Daml DAR via Seaport first.')
  return p
}
const tid = (template: string) => `${packageId()}:InvoPlus.Auth:${template}`

// ─── Ledger helpers ──────────────────────────────────────────────────────────
// Unwrap Canton JSON values that may arrive wrapped as { value: ... }
const pv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

function parseAcs(lines: any[]): { contractId: string; payload: any }[] {
  return (lines || [])
    .filter((l: any) => l?.contractEntry?.v1?.contract)
    .map((l: any) => {
      const c = l.contractEntry.v1.contract
      return { contractId: c.contractId, payload: c.payload }
    })
}

async function findCredentialByEmail(email: string) {
  const rows = parseAcs(await queryACS([platformParty()], [tid('UserCredential')]))
  return rows.find(r => pv(r.payload?.email) === email) ?? null
}
async function findCredentialByUserId(userId: string) {
  const rows = parseAcs(await queryACS([platformParty()], [tid('UserCredential')]))
  return rows.find(r => pv(r.payload?.userId) === userId) ?? null
}
async function findActiveSessionByToken(token: string) {
  const tokenHash = sha256(token)
  const rows = parseAcs(await queryACS([platformParty()], [tid('SessionToken')]))
  return rows.find(r => pv(r.payload?.tokenHash) === tokenHash && pv(r.payload?.isActive) === true) ?? null
}

// ─── Pure crypto (unchanged) ─────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  try {
    return await hash(password, BCRYPT_ROUNDS)
  } catch {
    throw new Error('Password hashing failed')
  }
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    const bcrypt = await import('bcryptjs')
    return await bcrypt.compare(password, passwordHash)
  } catch {
    return false
  }
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function createJWT(payload: Record<string, any>, expiresIn: string = JWT_EXPIRY): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions)
}

export function verifyJWT(token: string): Record<string, any> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, any>
  } catch {
    return null
  }
}

export function verifyAuthHeader(req: NextRequest): { userId: string; email: string; role: string; party?: string } | null {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  const decoded = verifyJWT(authHeader.slice(7))
  if (!decoded || !decoded.userId) return null
  return { userId: decoded.userId, email: decoded.email, role: decoded.role, party: decoded.party }
}

// ─── Register: allocate a party + create a UserCredential on Canton ──────────
export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  role: 'seller' | 'financier' = 'seller',
): Promise<{ success: boolean; userId?: string; party?: string; error?: string }> {
  if (!email || !password || !displayName) return { success: false, error: 'Missing required fields' }
  if (password.length < 8) return { success: false, error: 'Password must be at least 8 characters' }

  try {
    if (await findCredentialByEmail(email)) return { success: false, error: 'User already exists' }

    const userId = `user_${crypto.randomBytes(16).toString('hex')}`
    const passwordHash = await hashPassword(password)

    // Each user gets a Canton party — their ledger identity
    const hint = `invoplus-${email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)}-${Date.now().toString(36)}`
    const alloc = await allocateParty(displayName, hint)
    const userParty = alloc?.partyDetails?.party ?? alloc?.party
    if (!userParty) return { success: false, error: 'Party allocation failed' }

    await submitAndWait([platformParty()], [platformParty()], [{
      CreateCommand: {
        templateId: tid('UserCredential'),
        createArguments: {
          platform: platformParty(),
          userId,
          userParty,
          passwordHash,
          email,
          role,
          status: 'Active',
          createdAt: new Date().toISOString(),
          lastLoginAt: null,
          mfaEnabled: false,
        },
      },
    }])

    return { success: true, userId, party: userParty }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Registration failed' }
  }
}

// ─── Login: verify credential, create SessionToken, record login ─────────────
export async function loginUser(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{
  success: boolean
  token?: string
  refreshToken?: string
  user?: { id: string; email: string; displayName: string; role: string; party: string }
  error?: string
}> {
  try {
    const cred = await findCredentialByEmail(email)
    if (!cred) return { success: false, error: 'Invalid credentials' }

    const p = cred.payload
    const status = pv(p.status)
    if (status === 'Suspended') return { success: false, error: 'Account suspended' }
    if (status === 'Deleted') return { success: false, error: 'Account deleted' }

    const valid = await verifyPassword(password, pv(p.passwordHash))
    if (!valid) return { success: false, error: 'Invalid credentials' }

    const userId = pv(p.userId)
    const userParty = pv(p.userParty)
    const role = pv(p.role)

    // Session token recorded on the ledger (audit + revocation)
    const sessionToken = generateToken()
    const issuedAt = new Date()
    const expiresAt = new Date(issuedAt.getTime() + 24 * 60 * 60 * 1000)

    await submitAndWait([platformParty()], [platformParty()], [{
      CreateCommand: {
        templateId: tid('SessionToken'),
        createArguments: {
          platform: platformParty(),
          userId,
          userParty,
          token: sessionToken,
          tokenHash: sha256(sessionToken),
          role,
          issuedAt: issuedAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          isActive: true,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      },
    }])

    // Record the login on the credential (updates lastLoginAt)
    try {
      await submitAndWait([platformParty()], [platformParty()], [{
        ExerciseCommand: {
          templateId: tid('UserCredential'),
          contractId: cred.contractId,
          choice: 'RecordLogin',
          choiceArgument: {},
        },
      }])
    } catch { /* non-fatal: login still succeeds */ }

    const jwtToken = createJWT({ userId, email, role, party: userParty })
    const refreshToken = createJWT({ userId, type: 'refresh' }, REFRESH_TOKEN_EXPIRY)

    return {
      success: true,
      token: jwtToken,
      refreshToken,
      user: { id: userId, email, displayName: email.split('@')[0], role, party: userParty },
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Login failed' }
  }
}

// ─── Refresh: validate refresh JWT, confirm credential active, re-issue ──────
export async function refreshUserToken(
  refreshToken: string,
): Promise<{ success: boolean; token?: string; error?: string }> {
  const decoded = verifyJWT(refreshToken)
  if (!decoded || decoded.type !== 'refresh' || !decoded.userId) {
    return { success: false, error: 'Invalid refresh token' }
  }
  try {
    const cred = await findCredentialByUserId(decoded.userId)
    if (!cred) return { success: false, error: 'User not found' }
    if (pv(cred.payload.status) !== 'Active') return { success: false, error: 'Account not active' }

    const token = createJWT({
      userId: pv(cred.payload.userId),
      email: pv(cred.payload.email),
      role: pv(cred.payload.role),
      party: pv(cred.payload.userParty),
    })
    return { success: true, token }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Refresh failed' }
  }
}

// ─── Logout: revoke the SessionToken on the ledger ───────────────────────────
export async function logoutUser(token: string): Promise<boolean> {
  try {
    const session = await findActiveSessionByToken(token)
    if (!session) return false
    await submitAndWait([platformParty()], [platformParty()], [{
      ExerciseCommand: {
        templateId: tid('SessionToken'),
        contractId: session.contractId,
        choice: 'RevokeToken',
        choiceArgument: {},
      },
    }])
    return true
  } catch {
    return false
  }
}

// ─── Verify a session token against the ledger ───────────────────────────────
export async function verifySession(token: string): Promise<{ userId: string; email: string; role: string; party: string } | null> {
  try {
    const session = await findActiveSessionByToken(token)
    if (!session) return null
    if (new Date(pv(session.payload.expiresAt)) < new Date()) return null
    const cred = await findCredentialByUserId(pv(session.payload.userId))
    if (!cred || pv(cred.payload.status) !== 'Active') return null
    return {
      userId: pv(cred.payload.userId),
      email: pv(cred.payload.email),
      role: pv(cred.payload.role),
      party: pv(cred.payload.userParty),
    }
  } catch {
    return null
  }
}

// ─── Change password: UpdatePassword choice on the credential ────────────────
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 8) return { success: false, error: 'Password must be at least 8 characters' }
  try {
    const cred = await findCredentialByUserId(userId)
    if (!cred) return { success: false, error: 'User not found' }
    const valid = await verifyPassword(currentPassword, pv(cred.payload.passwordHash))
    if (!valid) return { success: false, error: 'Current password is incorrect' }

    const newHash = await hashPassword(newPassword)
    await submitAndWait([platformParty()], [platformParty()], [{
      ExerciseCommand: {
        templateId: tid('UserCredential'),
        contractId: cred.contractId,
        choice: 'UpdatePassword',
        choiceArgument: { newHash },
      },
    }])
    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Password change failed' }
  }
}

// ─── Suspend / resume an account ─────────────────────────────────────────────
async function setCredentialState(userId: string, choice: 'SuspendCredential' | 'RestoreCredential'): Promise<boolean> {
  try {
    const cred = await findCredentialByUserId(userId)
    if (!cred) return false
    await submitAndWait([platformParty()], [platformParty()], [{
      ExerciseCommand: {
        templateId: tid('UserCredential'),
        contractId: cred.contractId,
        choice,
        choiceArgument: {},
      },
    }])
    return true
  } catch {
    return false
  }
}

export async function suspendUser(userId: string): Promise<boolean> {
  return setCredentialState(userId, 'SuspendCredential')
}

export async function resumeUser(userId: string): Promise<boolean> {
  return setCredentialState(userId, 'RestoreCredential')
}
