'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import { FileText, Gavel, EyeOff, Zap } from 'lucide-react'

// Each step corresponds to a real Daml choice on the deployed InvoPlus package —
// not illustrative copy. See daml/InvoPlus/Invoice.daml for the exact contracts.
const steps = [
  {
    number: '01',
    tag: 'InvoiceContract',
    title: 'Upload & Score',
    description: 'The seller submits an invoice, creating an InvoiceContract on Canton. A deterministic risk engine — tenor, amount, currency, debtor profile — computes a 0–100 score and A–D grade, written on-chain via VerifyInvoice. No external AI call, no black box.',
    icon: FileText,
  },
  {
    number: '02',
    tag: 'Auction + RegistryEntry',
    title: 'List for Sealed-Bid Auction',
    description: 'ListForAuction creates an Auction and a RegistryEntry in one atomic transaction. The registry is checked before every future listing — the same invoice hash can never be financed twice.',
    icon: Gavel,
  },
  {
    number: '03',
    tag: 'SealedBid',
    title: 'Sealed Bids Roll In',
    description: 'Financiers submit SealedBid contracts. The seller is never added as an observer while a bid is sealed — Canton’s privacy model makes this unreadable to them, not just hidden by the UI.',
    icon: EyeOff,
  },
  {
    number: '04',
    tag: 'FundedInvoice',
    title: 'Atomic Settlement',
    description: 'Losing bids are rejected in their own private transactions — their contents never touch the seller’s view. The winning bid becomes a FundedInvoice, signed by both seller and financier, in a single Canton transaction.',
    icon: Zap,
  },
]

function StackCard({
  step, index, total, progress,
}: {
  step: typeof steps[number]
  index: number
  total: number
  progress: MotionValue<number>
}) {
  const targetScale = 1 - (total - 1 - index) * 0.04
  const range: [number, number] = [index / total, 1]
  const scale = useTransform(progress, range, [1, targetScale])
  const Icon = step.icon

  return (
    <div className="sticky top-24 md:top-28 h-[70vh] flex items-start justify-center" style={{ top: `${96 + index * 24}px` }}>
      <motion.div
        style={{ scale }}
        className="w-full max-w-4xl rounded-[2.5rem] border-2 border-white/15 bg-slate-900 p-8 md:p-12 shadow-2xl origin-top"
      >
        <div className="flex items-start justify-between gap-6 mb-8">
          <span className="font-data text-6xl md:text-7xl font-bold text-white/10">{step.number}</span>
          <span className="text-xs font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full font-data">
            {step.tag}
          </span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-violet-300" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white">{step.title}</h3>
        </div>

        <p className="text-base md:text-lg text-slate-400 leading-relaxed max-w-2xl">{step.description}</p>
      </motion.div>
    </div>
  )
}

export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  return (
    <section id="how-it-works" className="relative bg-slate-950 border-t border-slate-800 overflow-hidden">
      {/* Ambient "liquid glass" glow — stays in view as a sticky backdrop for
          the whole scroll-driven card stack below, instead of scrolling away
          with the content. Brand teal, not the reference's blue. */}
      <div className="sticky top-0 h-screen pointer-events-none -z-10">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-1/4 w-[500px] h-[500px] rounded-full bg-violet-400/10 blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-24 lg:pt-32">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-2 mb-6">
            <span className="text-xs text-slate-300 font-medium">HOW IT WORKS</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Every step is a real Canton transaction
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Not a diagram — the exact Daml contracts that run on Canton DevNet today.
          </p>
        </div>
      </div>

      <div ref={containerRef} style={{ height: `${steps.length * 90}vh` }} className="relative max-w-4xl mx-auto px-6">
        {steps.map((step, i) => (
          <StackCard key={step.number} step={step} index={i} total={steps.length} progress={scrollYProgress} />
        ))}
      </div>

      <div className="h-24 lg:h-32" />
    </section>
  )
}
