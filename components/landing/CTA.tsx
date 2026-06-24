import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
        <div className="bg-violet-500 rounded-3xl p-12 lg:p-16 relative overflow-hidden">
          {/* BG decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
              Create your first invoice in seconds
            </h2>
            <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
              Start invoicing today and accept payments online. Fast setup, beautiful templates, and instant notifications.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/dashboard"
                className="flex items-center gap-2 bg-white text-violet-600 font-semibold px-8 py-4 rounded-2xl hover:bg-violet-50 transition-colors group">
                Create Invoice
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link href="/pricing"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-8 py-4 rounded-2xl transition-colors">
                See Pricing
              </Link>
            </div>
            <p className="text-white/50 text-sm mt-6">
              No credit check required · Free to upload · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
