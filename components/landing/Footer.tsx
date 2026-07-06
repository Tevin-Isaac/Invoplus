import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200/20 bg-slate-50 text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={28} showText={false} />
          <span className="sr-only">Invoplus</span>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm text-slate-500 dark:text-slate-400">
          <Link href="#platform" className="hover:text-slate-900 dark:hover:text-white transition-colors">platform</Link>
          <Link href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">how it works</Link>
          <Link href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">features</Link>
          <Link href="#support" className="hover:text-slate-900 dark:hover:text-white transition-colors">support</Link>
          <a
            href="https://x.com/invoplus"
            target="_blank"
            rel="noreferrer"
            aria-label="Follow Invoplus on X"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-violet-500 hover:text-violet-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
              <path d="M18.9 2H22l-6.6 7.6L23.3 22h-5.9l-4.7-6.2L7.3 22H4.2l7-8.1L.7 2h6.1l4.3 5.7L18.9 2Z" />
            </svg>
          </a>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">© {year} invoplus. All rights reserved.</p>
      </div>
    </footer>
  )
}
