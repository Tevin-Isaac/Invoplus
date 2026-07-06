import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'
import { useI18n } from '@/lib/i18n/I18nContext'

export function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200/20 bg-slate-50 text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Logo size={28} showText={false} />
          <span className="sr-only">Invoplus</span>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm text-slate-500 dark:text-slate-400">
          <Link href="#platform" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t('nav.platform')}</Link>
          <Link href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t('nav.howItWorks')}</Link>
          <Link href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t('nav.features')}</Link>
          <Link href="#support" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t('nav.support')}</Link>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">© {year} invoplus. {t('footer.rights')}</p>
      </div>
    </footer>
  )
}
