'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmState {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
}

// Replaces window.confirm() everywhere — native browser dialogs can't be
// styled at all (font, sizing, wrapping are all up to the OS/browser),
// which is exactly what read as "looks bad, this can't be undone" on a
// settle click. One shared component so every destructive/irreversible
// action across the app gets the same real, on-brand confirmation.
export function ConfirmDialog({ state, busy, onClose }: { state: ConfirmState | null; busy?: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {state && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div className={cn(
              'mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full',
              state.danger ? 'bg-red-500/15' : 'bg-amber-500/15'
            )}>
              <AlertTriangle className={cn('h-7 w-7', state.danger ? 'text-red-500' : 'text-amber-500')} />
            </div>
            <h3 className="text-center text-base font-bold text-slate-950 dark:text-white">{state.title}</h3>
            <p className="mt-1.5 text-center text-xs leading-relaxed text-slate-500 dark:text-slate-400">{state.message}</p>
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={onClose}
                disabled={busy}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-950 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={state.onConfirm}
                disabled={busy}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold text-white shadow-lg transition-colors disabled:opacity-60',
                  state.danger ? 'bg-red-500 shadow-red-500/25 hover:bg-red-600' : 'bg-violet-500 shadow-violet-500/25 hover:bg-violet-600'
                )}
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {busy ? 'Working…' : (state.confirmLabel ?? 'Confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
