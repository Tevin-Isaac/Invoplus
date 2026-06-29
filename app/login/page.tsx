'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { useAuth } from '@/lib/auth-context'
import { Loader2, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email || !password) { setError('Enter your email and password'); return }
    setLoading(true); setError(null)
    const res = await login(email, password)
    setLoading(false)
    if (res.ok) router.push('/dashboard')
    else setError(res.error ?? 'Login failed')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Logo size={40} textClassName="text-2xl" tone="dark" />
        </div>
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-white mb-1">Welcome back</h1>
          <p className="text-sm text-dark-muted mb-6">Sign in to your Invoplus account</p>

          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-xs text-dark-muted mb-1.5 block">Email</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="you@company.com"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-dark-muted outline-none focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="text-xs text-dark-muted mb-1.5 block">Password</label>
              <input
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder="••••••••"
                className="w-full bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-dark-muted outline-none focus:border-violet-500/50"
              />
            </div>
            <button
              onClick={submit} disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign in'}
            </button>
          </div>

          <p className="text-xs text-dark-muted text-center mt-6">
            New to Invoplus? <Link href="/register" className="text-violet-400 hover:text-violet-300 font-medium">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
