import { hash } from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h'
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'
const BCRYPT_ROUNDS = 12

// In-memory store for demo (use database in production)
interface User {
  id: string
  email: string
  passwordHash: string
  displayName: string
  role: 'seller' | 'financier' | 'admin'
  mfaEnabled: boolean
  status: 'active' | 'suspended' | 'deleted'
  createdAt: Date
  lastLoginAt?: Date
}

interface Session {
  userId: string
  token: string
  expiresAt: Date
  isActive: boolean
}

const users = new Map<string, User>()
const sessions = new Map<string, Session>()
const refreshTokens = new Map<string, { userId: string; expiresAt: Date }>()

/**
 * Hash a password securely using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hashedPassword = await hash(password, BCRYPT_ROUNDS)
    return hashedPassword
  } catch (error) {
    throw new Error('Password hashing failed')
  }
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    const bcrypt = await import('bcryptjs')
    return await bcrypt.compare(password, hash)
  } catch (error) {
    return false
  }
}

/**
 * Generate a random token
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Create a JWT token
 */
export function createJWT(payload: Record<string, any>, expiresIn: string = JWT_EXPIRY): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

/**
 * Verify a JWT token
 */
export function verifyJWT(token: string): Record<string, any> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, any>
  } catch (error) {
    return null
  }
}

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  role: 'seller' | 'financier' = 'seller',
): Promise<{ success: boolean; userId?: string; error?: string }> {
  // Validate input
  if (!email || !password || !displayName) {
    return { success: false, error: 'Missing required fields' }
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }

  // Check if user already exists
  if (Array.from(users.values()).some((u) => u.email === email)) {
    return { success: false, error: 'User already exists' }
  }

  try {
    const userId = `user_${crypto.randomBytes(16).toString('hex')}`
    const passwordHash = await hashPassword(password)

    const newUser: User = {
      id: userId,
      email,
      passwordHash,
      displayName,
      role,
      mfaEnabled: false,
      status: 'active',
      createdAt: new Date(),
    }

    users.set(userId, newUser)

    return { success: true, userId }
  } catch (error) {
    return { success: false, error: 'Registration failed' }
  }
}

/**
 * Login user and create session
 */
export async function loginUser(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{
  success: boolean
  token?: string
  refreshToken?: string
  user?: { id: string; email: string; displayName: string; role: string }
  error?: string
}> {
  // Find user by email
  const user = Array.from(users.values()).find((u) => u.email === email)

  if (!user) {
    return { success: false, error: 'Invalid credentials' }
  }

  if (user.status === 'suspended') {
    return { success: false, error: 'Account suspended' }
  }

  if (user.status === 'deleted') {
    return { success: false, error: 'Account deleted' }
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash)
  if (!passwordValid) {
    return { success: false, error: 'Invalid credentials' }
  }

  try {
    // Create session token
    const sessionToken = generateToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    sessions.set(sessionToken, {
      userId: user.id,
      token: sessionToken,
      expiresAt,
      isActive: true,
    })

    // Create JWT
    const jwtToken = createJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    // Create refresh token
    const refreshToken = generateToken()
    const refreshExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    refreshTokens.set(refreshToken, { userId: user.id, expiresAt: refreshExpiry })

    // Update last login
    user.lastLoginAt = new Date()
    users.set(user.id, user)

    return {
      success: true,
      token: jwtToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    }
  } catch (error) {
    return { success: false, error: 'Login failed' }
  }
}

/**
 * Refresh JWT token using refresh token
 */
export function refreshUserToken(
  refreshToken: string,
): { success: boolean; token?: string; error?: string } {
  const refreshData = refreshTokens.get(refreshToken)

  if (!refreshData) {
    return { success: false, error: 'Invalid refresh token' }
  }

  if (refreshData.expiresAt < new Date()) {
    refreshTokens.delete(refreshToken)
    return { success: false, error: 'Refresh token expired' }
  }

  const user = users.get(refreshData.userId)
  if (!user) {
    return { success: false, error: 'User not found' }
  }

  const newJwt = createJWT({
    userId: user.id,
    email: user.email,
    role: user.role,
  })

  return { success: true, token: newJwt }
}

/**
 * Logout user and invalidate session
 */
export function logoutUser(token: string): boolean {
  const session = sessions.get(token)
  if (!session) return false

  session.isActive = false
  sessions.set(token, session)
  return true
}

/**
 * Verify session is valid
 */
export function verifySession(token: string): User | null {
  const session = sessions.get(token)

  if (!session || !session.isActive) {
    return null
  }

  if (session.expiresAt < new Date()) {
    session.isActive = false
    sessions.set(token, session)
    return null
  }

  const user = users.get(session.userId)
  return user || null
}

/**
 * Middleware to verify JWT in request headers
 */
export function verifyAuthHeader(req: NextRequest): { userId: string; email: string; role: string } | null {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const decoded = verifyJWT(token)

  if (!decoded || !decoded.userId) {
    return null
  }

  return {
    userId: decoded.userId,
    email: decoded.email,
    role: decoded.role,
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  const user = users.get(userId)
  if (!user) {
    return { success: false, error: 'User not found' }
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' }
  }

  // Verify current password
  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) {
    return { success: false, error: 'Current password is incorrect' }
  }

  try {
    const newHash = await hashPassword(newPassword)
    user.passwordHash = newHash
    users.set(userId, user)
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Password change failed' }
  }
}

/**
 * Suspend user account
 */
export function suspendUser(userId: string): boolean {
  const user = users.get(userId)
  if (!user) return false

  user.status = 'suspended'
  users.set(userId, user)
  return true
}

/**
 * Resume suspended user account
 */
export function resumeUser(userId: string): boolean {
  const user = users.get(userId)
  if (!user) return false

  user.status = 'active'
  users.set(userId, user)
  return true
}
