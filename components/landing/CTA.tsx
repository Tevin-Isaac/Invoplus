'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-24 lg:py-32 bg-slate-950 border-t border-slate-800">
      <div className="max-w-4xl mx-auto px-6 lg:px-10 text-center">
        <div className="bg-gradient-to-br from-slate-900 to-slate-900/50 rounded-2xl p-12 lg:p-16 border border-slate-800 relative overflow-hidden">
          {/* BG decoration */}
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-violet-500/5 -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-violet-500/5 translate-y-1/2 -translate-x-1/2 blur-3xl" />

          <div className="relative">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Ready to grow your business?
            </h2>
            <p className="text-lg text-slate-400 mb-10 max-w-xl mx-auto">
              Join thousands of businesses using Invoplus to create invoices, get funded, and grow their cash flow.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors group"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 border border-slate-700 hover:border-slate-600 text-white font-semibold px-8 py-4 rounded-lg transition-colors"
              >
                View Features
              </a>
            </div>
            <p className="text-slate-500 text-sm mt-6">
              No credit card required · 30-day free trial · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
