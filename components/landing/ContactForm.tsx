'use client'

import { useState } from 'react'
import { Loader2, CheckCircle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nContext'

export function ContactForm() {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error ?? t('contactForm.genericError'))
      setStatus('sent')
    } catch (e) {
      setError(e instanceof Error ? e.message : t('contactForm.genericError'))
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex items-center gap-2.5 text-slate-950 dark:text-white">
        <CheckCircle className="w-5 h-5 text-violet-500 shrink-0" />
        <p className="text-sm">{t('contactForm.thanks')}</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          required
          placeholder={t('contactForm.namePlaceholder')}
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-950 dark:text-white placeholder:text-slate-400 outline-none focus:border-violet-500/50"
        />
        <input
          required
          type="email"
          placeholder={t('contactForm.emailPlaceholder')}
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-950 dark:text-white placeholder:text-slate-400 outline-none focus:border-violet-500/50"
        />
      </div>
      <textarea
        required
        rows={3}
        placeholder={t('contactForm.messagePlaceholder')}
        value={message}
        onChange={e => setMessage(e.target.value)}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-950 dark:text-white placeholder:text-slate-400 outline-none focus:border-violet-500/50 resize-none"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex items-center gap-2 bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-sm font-semibold rounded-full px-6 py-2.5 hover:opacity-90 transition disabled:opacity-60"
      >
        {status === 'sending' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {status === 'sending' ? t('contactForm.sending') : t('contactForm.send')}
      </button>
    </form>
  )
}
