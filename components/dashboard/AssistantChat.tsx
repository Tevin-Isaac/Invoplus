'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles, X, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCanton } from '@/lib/canton'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const STARTERS = [
  'How do sealed bids stay private?',
  "What's my balance and where did it come from?",
  'How does settlement pick a winner?',
]

const MAX_HISTORY = 40
// Conversation memory is scoped per identity, same pattern as
// lib/notifications.tsx — switching parties (or disconnecting) never
// leaks one identity's chat into another's.
const storageKey = (partyId: string | null) => `invoplus-assistant:${partyId ?? 'anon'}`

export function AssistantChat() {
  const { party } = useCanton()
  const partyId = party?.id ?? null
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [balance, setBalance] = useState<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load this identity's remembered conversation whenever the connected
  // party changes (including on first mount / reconnect after a refresh).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey(partyId))
      setMessages(raw ? JSON.parse(raw) : [])
    } catch { setMessages([]) }
  }, [partyId])

  const persist = (items: ChatMessage[]) => {
    try { window.localStorage.setItem(storageKey(partyId), JSON.stringify(items.slice(-MAX_HISTORY))) } catch { /* unavailable */ }
  }

  const clearHistory = () => {
    setMessages([])
    try { window.localStorage.removeItem(storageKey(partyId)) } catch { /* unavailable */ }
  }

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Lightweight, independent of Header's own balance chip — just enough
  // context for the assistant to give role-aware answers.
  useEffect(() => {
    if (!party?.id) { setBalance(null); return }
    let cancelled = false
    fetch('/api/canton/contracts/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partyId: party.id, role: party.type }),
    }).then(r => r.json()).then(d => { if (!cancelled && d.ok) setBalance(d.amount) }).catch(() => {})
    return () => { cancelled = true }
  }, [party?.id, party?.type])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || streaming) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: trimmed }]
    setMessages(next)
    setInput('')
    setStreaming(true)
    setMessages(m => [...m, { role: 'assistant', content: '' }])

    let acc = ''
    try {
      // Full remembered history goes with every request — Claude has no
      // server-side memory of its own, so the client is the source of
      // truth for "remembering" a conversation across turns and reloads.
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          context: party ? { partyType: party.type, displayName: party.displayName, balance } : null,
        }),
      })
      if (!res.body) throw new Error('No response stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
        setMessages(m => {
          const copy = [...m]
          copy[copy.length - 1] = { role: 'assistant', content: acc }
          return copy
        })
      }
      persist([...next, { role: 'assistant', content: acc }])
    } catch (e) {
      const errMsg = `Sorry, something went wrong: ${e instanceof Error ? e.message : 'network error'}`
      setMessages(m => {
        const copy = [...m]
        copy[copy.length - 1] = { role: 'assistant', content: errMsg }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(o => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform hover:scale-105 dark:ring-white/10"
        aria-label="Ask the InvoPlus assistant"
        aria-expanded={open}
      >
        <Image src="/bot-icon.png" alt="" width={26} height={26} className="object-contain" />
        {/* A quiet "alive" pulse — not a badge/count, just a signal this is interactive and ready */}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-500" />
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-2 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-500/10 to-transparent px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                  <Image src="/bot-icon.png" alt="" width={22} height={22} className="object-contain" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">InvoPlus Assistant</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    {party ? `Guiding you as a ${party.type}` : 'Ask me anything about InvoPlus'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button onClick={clearHistory} className="text-slate-400 hover:text-red-500" title="Clear conversation" aria-label="Clear conversation">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-950 dark:hover:text-white" aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 dark:ring-white/10">
                    <Image src="/bot-icon.png" alt="" width={32} height={32} className="object-contain" />
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    I know how sealed bids, settlement, and balances actually work here — ask away.
                  </p>
                  <div className="flex flex-col gap-1.5 w-full">
                    {STARTERS.map(s => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-left text-xs text-slate-600 transition-colors hover:border-violet-500/50 hover:text-violet-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-violet-300"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-xs leading-relaxed',
                      m.role === 'user'
                        ? 'bg-violet-500 text-white'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                    )}>
                      {m.content || (streaming && i === messages.length - 1 && (
                        <span className="flex items-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />Thinking…
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={e => { e.preventDefault(); send(input) }}
              className="flex items-center gap-2 border-t border-slate-100 p-3 dark:border-slate-800"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about bidding, balances, settlement…"
                disabled={streaming}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-950 outline-none placeholder:text-slate-400 focus:border-violet-500/60 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-500 text-white transition-colors hover:bg-violet-600 disabled:opacity-40"
                aria-label="Send"
              >
                {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
