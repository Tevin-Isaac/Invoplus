'use client'

import { useEffect, useRef, useState } from 'react'
import { LANGUAGES } from '@/lib/i18n/languages'
import { useI18n } from '@/lib/i18n/I18nContext'

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LANGUAGES.find(l => l.code === locale) ?? LANGUAGES[0]

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="bg-white/10 text-white hover:bg-white/20 rounded-full p-3 transition text-base leading-none"
        aria-label="Change language"
        aria-expanded={open}
      >
        {current.flag}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 max-h-72 overflow-y-auto rounded-2xl bg-slate-900/95 backdrop-blur border border-white/10 shadow-2xl py-1.5 z-30">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => { setLocale(lang.code); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors ${
                lang.code === locale ? 'text-white bg-white/10' : 'text-neutral-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="text-base leading-none">{lang.flag}</span>
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
