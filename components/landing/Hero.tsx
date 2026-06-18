'use client'

import Link from 'next/link'
import { ArrowRight, ShieldCheck, Zap, Lock } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white pt-20">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-violet-50 blur-3xl opacity-60" />
        <div className="absolute top-20 right-20 w-64 h-64 rounded-full bg-violet-100 blur-3xl opacity-40" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 text-violet-600 text-xs font-semibold px-4 py-2 rounded-full mb-8">
          <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          Built on Canton Network · Privacy-Native Blockchain
        </div>

        {/* Headline */}
        <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-tight tracking-tight mb-6">
          Invoice Financing,{' '}
          <span className="gradient-text">Finally Private</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-xl lg:text-2xl text-gray-500 max-w-3xl mx-auto leading-relaxed mb-4">
          Financiers compete to fund your invoices in sealed-bid auctions.
          They never see each other&apos;s offers. You see all of them.
          Settlement is atomic and instant.
        </p>
        <p className="text-base text-gray-400 max-w-2xl mx-auto mb-12">
          The first blind-auction invoice marketplace built on Canton Network —
          where confidentiality is native, not bolted on.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link href="/dashboard"
            className="flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all hover:shadow-lg hover:shadow-violet-200 group">
            Get Funded Today
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link href="/dashboard"
            className="flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-violet-200 text-gray-700 hover:text-violet-600 font-semibold text-base px-8 py-4 rounded-2xl transition-all">
            Start Investing
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-500" />
            <span>Private sealed-bid auctions</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300" />
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-violet-500" />
            <span>Atomic settlement in seconds</span>
          </div>
          <div className="hidden sm:block w-1 h-1 rounded-full bg-gray-300" />
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-500" />
            <span>AI-powered risk analysis</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {[
            { value: '$2.4B+', label: 'Invoice Volume Processed' },
            { value: '3.2s',   label: 'Average Settlement Time' },
            { value: '98.7%',  label: 'Advance Rate Achieved' },
            { value: '850+',   label: 'Businesses Funded' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-gray-900 mb-1">{s.value}</div>
              <div className="text-sm text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
