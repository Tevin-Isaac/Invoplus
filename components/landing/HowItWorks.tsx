'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'framer-motion'
import { FileText, Gavel, EyeOff, Zap, DollarSign, Receipt, Coins } from 'lucide-react'

// Fixed positions/delays (not random) so server- and client-rendered markup
// match exactly — avoids hydration mismatches from Math.random().
const particles = [
  { Icon: DollarSign, top: '12%', left: '8%', size: 28, duration: '7s', delay: '0s' },
  { Icon: Receipt, top: '22%', left: '85%', size: 24, duration: '9s', delay: '1.2s' },
  { Icon: Coins, top: '48%', left: '15%', size: 22, duration: '8s', delay: '2.4s' },
  { Icon: FileText, top: '65%', left: '90%', size: 26, duration: '10s', delay: '0.6s' },
  { Icon: DollarSign, top: '78%', left: '6%', size: 20, duration: '7.5s', delay: '3s' },
  { Icon: Coins, top: '35%', left: '55%', size: 18, duration: '8.5s', delay: '1.8s' },
  { Icon: Receipt, top: '85%', left: '70%', size: 24, duration: '9.5s', delay: '0.9s' },
]

// Selling points, not technical descriptions — but every claim here is true
// to how the deployed InvoPlus package actually behaves on Canton DevNet.
const steps = [
  {
    number: '01',
    tag: 'Upload',
    title: 'Upload & Get Scored',
    description: 'Submit your invoice and get an instant, unbiased risk score and grade — no manual review, no waiting on a loan officer.',
    icon: FileText,
  },
  {
    number: '02',
    tag: 'List',
    title: 'List It for Bidding',
    description: 'Your invoice goes live to a pool of financiers — and is protected from ever being listed or financed twice.',
    icon: Gavel,
  },
  {
    number: '03',
    tag: 'Bid',
    title: 'Financiers Bid Blind',
    description: 'Financiers compete on price without seeing each other’s offers, so you get the best rate the market will bear — not the first one.',
    icon: EyeOff,
  },
  {
    number: '04',
    tag: 'Get Paid',
    title: 'Get Paid Instantly',
    description: 'The winning bid settles immediately and irreversibly. No partial payments, no waiting days for funds to clear.',
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
    <section id="how-it-works" className="relative bg-slate-950 border-t border-slate-800">
      {/* Ambient "liquid glass" glow + finance-themed particles. Positioned
          `absolute inset-0` (not `sticky h-screen`) so it never occupies its
          own layout space — a sticky h-screen block here previously pushed
          the intro heading down by a full viewport height, which is what
          read as "huge wasted blank space" scrolling in from the hero. An
          absolute layer spans the section's real (content-driven) height
          instead, so no gap is introduced. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-violet-500/20 blur-[120px] animate-drift-1" />
        <div className="absolute top-1/3 -right-1/4 w-[500px] h-[500px] rounded-full bg-violet-400/10 blur-[120px] animate-drift-2" />
        {particles.map((p, i) => (
          <p.Icon
            key={i}
            className="absolute text-violet-300/20 animate-float"
            style={{ top: p.top, left: p.left, width: p.size, height: p.size, animationDuration: p.duration, animationDelay: p.delay }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-12 lg:pt-16">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-2 mb-6">
            <span className="text-xs text-slate-300 font-medium">HOW IT WORKS</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            From invoice to cash in four steps
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            No paperwork, no waiting on a bank — just a fast, transparent path from unpaid invoice to money in hand.
          </p>
        </div>
      </div>

      <div ref={containerRef} style={{ height: `${steps.length * 70}vh` }} className="relative max-w-4xl mx-auto px-6">
        {steps.map((step, i) => (
          <StackCard key={step.number} step={step} index={i} total={steps.length} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  )
}
