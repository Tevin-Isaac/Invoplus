import Image from 'next/image'
import { Lock, Zap, ShieldCheck, Check, ArrowRight } from 'lucide-react'
import { useI18n } from '@/lib/i18n/I18nContext'

// Cross-checked against what InvoPlus actually does. The three core Canton
// guarantees — matches the hero stats and the how-it-works pillars.
const featureIcons = [Lock, Zap, ShieldCheck]

export function Features() {
  const { t } = useI18n()
  const features = [1, 2, 3].map((n, i) => ({
    number: `0${n}`,
    icon: featureIcons[i],
    title: t(`features.feature${n}Title`),
    points: [
      t(`features.feature${n}Point1`),
      t(`features.feature${n}Point2`),
      t(`features.feature${n}Point3`),
    ],
  }))

  return (
    <section id="features" className="py-12 lg:py-16 bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-2 mb-4">
            <span className="text-xs text-slate-300 font-medium">{t('features.badge')}</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white">
            {t('features.headline')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Image card — dashboard preview, sits alongside the 3 checklist cards */}
          <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 lg:row-span-1">
            <Image
              src="/platform-preview.png"
              alt="Anti-fraud registry — invoices, financiers, and the ledger connected in one verified network"
              width={1536}
              height={1024}
              className="w-full h-full object-cover"
            />
          </div>

          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.number}
                className="p-7 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-violet-400" />
                  </div>
                  <span className="font-data text-2xl font-bold text-white/10">{feature.number}</span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-4">{feature.title}</h3>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-slate-400">
                      <Check className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>

                <a href="#how-it-works" className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-violet-300 transition-colors group">
                  {t('features.learnMore')}
                  <ArrowRight className="w-3.5 h-3.5 -rotate-45 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
