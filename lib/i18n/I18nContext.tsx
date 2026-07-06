'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LANGUAGES, DEFAULT_LANGUAGE, type LanguageCode } from './languages'
import en from './locales/en.json'

// Lazily loaded per language so we never ship all ~10 locale bundles in the
// initial JS payload — only English (inlined) plus whichever one the user
// actually picks.
const loaders: Record<LanguageCode, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => Promise.resolve({ default: en }),
  es: () => import('./locales/es.json'),
  fr: () => import('./locales/fr.json'),
  de: () => import('./locales/de.json'),
  pt: () => import('./locales/pt.json'),
  ar: () => import('./locales/ar.json'),
  zh: () => import('./locales/zh.json'),
  hi: () => import('./locales/hi.json'),
  sw: () => import('./locales/sw.json'),
  ru: () => import('./locales/ru.json'),
  ja: () => import('./locales/ja.json'),
}

type Dict = Record<string, unknown>

function lookup(dict: Dict, key: string): string | undefined {
  const value = key.split('.').reduce<unknown>((node, part) => {
    if (node && typeof node === 'object') return (node as Dict)[part]
    return undefined
  }, dict)
  return typeof value === 'string' ? value : undefined
}

interface I18nContextValue {
  locale: LanguageCode
  setLocale: (code: LanguageCode) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const STORAGE_KEY = 'invoplus-locale'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LanguageCode>(DEFAULT_LANGUAGE)
  const [dict, setDict] = useState<Dict>(en as Dict)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as LanguageCode | null
    if (stored && loaders[stored]) setLocaleState(stored)
  }, [])

  useEffect(() => {
    let cancelled = false
    loaders[locale]().then(mod => {
      if (!cancelled) setDict(mod.default as Dict)
    })
    const lang = LANGUAGES.find(l => l.code === locale)
    document.documentElement.lang = locale
    document.documentElement.dir = lang?.rtl ? 'rtl' : 'ltr'
    window.localStorage.setItem(STORAGE_KEY, locale)
    return () => { cancelled = true }
  }, [locale])

  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale: setLocaleState,
    t: (key: string) => lookup(dict, key) ?? lookup(en as Dict, key) ?? key,
  }), [locale, dict])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
