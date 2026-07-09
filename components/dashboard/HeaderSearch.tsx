'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, FileText, Gavel } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'

interface Hit {
  id: string
  invoiceId: string
  debtorName: string
  amount: number
  status: string
  kind: 'invoice' | 'auction'
}

const vv = (x: any) => (x && typeof x === 'object' && 'value' in x ? x.value : x)

// A real live search against the connected party's own ledger data — not a
// decorative box. Debounced, queries invoice + auction templates through
// the existing /api/canton/contracts/list route, filters client-side by
// invoice ID or debtor name.
export function HeaderSearch() {
  const { party } = useCanton()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hits, setHits] = useState<Hit[]>([])
  const boxRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim().toLowerCase()
    if (q.length < 2 || !party?.id) { setHits([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const [invRes, aucRes] = await Promise.all([
          fetch('/api/canton/contracts/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parties: [party.id], template: 'invoice' }),
          }).then(r => r.json()),
          fetch('/api/canton/contracts/list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parties: [party.id], template: 'auction' }),
          }).then(r => r.json()),
        ])
        const results: Hit[] = []
        for (const c of invRes.contracts ?? []) {
          const p = c.payload || {}
          const invoiceId = String(vv(p.invoiceId) ?? '')
          const debtorName = String(vv(p.debtorName) ?? '')
          if (invoiceId.toLowerCase().includes(q) || debtorName.toLowerCase().includes(q)) {
            results.push({ id: c.contractId, invoiceId, debtorName, amount: Number(vv(p.faceAmount) ?? 0), status: String(vv(p.status) ?? ''), kind: 'invoice' })
          }
        }
        for (const c of aucRes.contracts ?? []) {
          const p = c.payload || {}
          if (vv(p.seller) !== party.id) continue
          const invoiceId = String(vv(p.invoiceId) ?? '')
          const debtorName = String(vv(p.debtorName) ?? '')
          if (invoiceId.toLowerCase().includes(q) || debtorName.toLowerCase().includes(q)) {
            results.push({ id: c.contractId, invoiceId, debtorName, amount: Number(vv(p.faceAmount) ?? 0), status: 'Listed', kind: 'auction' })
          }
        }
        setHits(results.slice(0, 8))
      } catch { setHits([]) } finally { setLoading(false) }
    }, 300)
  }, [query, party?.id])

  const go = (hit: Hit) => {
    setOpen(false)
    setQuery('')
    router.push(hit.kind === 'auction' ? '/dashboard/marketplace' : '/dashboard/invoices')
  }

  return (
    <div className="relative hidden md:block" ref={boxRef}>
      <div className="flex w-40 items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-500 transition-all focus-within:w-52 focus-within:border-violet-500/50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 lg:w-48 lg:focus-within:w-64">
        <Search className="h-4 w-4 shrink-0" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search invoices…"
          className="w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />}
      </div>

      <AnimatePresence>
        {open && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {!party ? (
              <p className="p-4 text-xs text-slate-500 dark:text-slate-400">Connect your Canton identity to search your invoices.</p>
            ) : loading ? (
              <p className="p-4 text-xs text-slate-500 dark:text-slate-400">Searching the ledger…</p>
            ) : hits.length === 0 ? (
              <p className="p-4 text-xs text-slate-500 dark:text-slate-400">No matches for "{query}".</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {hits.map(hit => (
                  <button
                    key={hit.id}
                    onClick={() => go(hit)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-violet-500/[0.06]"
                  >
                    {hit.kind === 'auction'
                      ? <Gavel className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                      : <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-950 dark:text-white">{hit.invoiceId || 'Untitled invoice'}</p>
                      <p className="truncate text-[10px] text-slate-400 dark:text-slate-500">{hit.debtorName} · ${hit.amount.toLocaleString()} · {hit.status}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
