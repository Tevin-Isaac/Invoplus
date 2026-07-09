'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-950 dark:hover:bg-white/10 dark:hover:text-white"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}
