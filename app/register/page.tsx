'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { useAuth } from '@/lib/auth-context'
import { Loader2, AlertCircle, Building2, Landmark } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const { register, login } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'seller' | 'financier'>('seller')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!displayName || !email || !password) { setError('Fill in all fields'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError(null)
    const res = await register(displayName, email, password, role)
    if (!res.ok) { setLoading(false); setError(res.error ?? 'Registration failed'); return }
    // Auto sign in after successful registration
    const li = await login(email, password)
    setLoading(false)
    if (li.ok) router.push('/dashboard')
    else router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size={40} textClassName="text-2xl" tone="dark" />
        </div>
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-white mb-1">Create your account</h1>
          <p className="text-sm text-dark-muted mb-6">Start financing or funding invoices on Canton</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs text-dark-muted mb-1.5 block">Name</label>
              <input
                value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="Acme Trading Ltd"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-dark-muted outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-dark-muted mb-1.5 block">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-dark-muted outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-dark-muted mb-1.5 block">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-dark-muted outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-dark-muted mb-2 block">I am a</label>
              <div className="grid grid-cols-2 gap-2">
                {([['seller', 'Business', Building2], ['financier', 'Financier', Landmark]] as const).map(([r, lbl, Icon]) => (
                  <button
                    key={r} type="button" onClick={() => setRole(r)}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all',
                      role === r ? 'bg-violet-500/15 border-violet-500/40 text-violet-300' : 'border-dark-border text-dark-muted hover:text-white'
                    )}
                  >
                    <Icon className="w-4 h-4" />{lbl}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={submit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create account'}
            </button>
          </div>

          <p className="text-xs text-dark-muted text-center mt-6">
            Already have an account? <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
