'use client'

import Image from 'next/image'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Features } from '@/components/landing/Features'
import { ContactForm } from '@/components/landing/ContactForm'
import { Footer } from '@/components/landing/Footer'
import { CookieConsent } from '@/components/landing/CookieConsent'
import { Check } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nContext'

export default function HomePage() {
  const { t } = useI18n()
  return (
    <div className="bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <Hero />
      <HowItWorks />

      <main>
        <section id="platform" className="px-6 py-12 md:px-10 bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
          <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1fr_1fr] items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">{t('platform.label')}</p>
              <h2 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">{t('platform.headline')}</h2>
              <p className="mt-6 max-w-xl text-slate-600 dark:text-slate-300 leading-8">
                {t('platform.intro')}
              </p>
              <div className="mt-8 space-y-4">
                {[1, 2, 3, 4].map((n) => ({
                  title: t(`platform.item${n}Title`),
                  text: t(`platform.item${n}Text`),
                })).map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
              <Image
                src="/paid.png"
                alt="Invoice paid notification — payment received"
                width={1536}
                height={1024}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </section>

        <Features />

        <section id="support" className="px-6 py-10 md:px-10 bg-slate-100 dark:bg-slate-900">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 order-2 md:order-1">
              <Image src="/support.png" alt="Support" width={1536} height={1024} className="w-full h-auto object-cover" />
            </div>
            <div className="order-1 md:order-2">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-3">{t('support.label')}</p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-950 dark:text-white mb-2">
                {t('support.headline')}
              </h2>
              <a href="mailto:support@invoplus.xyz" className="text-sm text-violet-600 dark:text-violet-400 hover:underline mb-4 inline-block">
                support@invoplus.xyz
              </a>
              <div className="mt-4">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      <CookieConsent />
    </div>
  )
}
