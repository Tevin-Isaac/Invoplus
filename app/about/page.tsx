'use client'

import Link from 'next/link'
import { Zap, Shield, Users } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6">
          <Link href="/" className="text-slate-400 hover:text-white text-sm font-medium">
            ← Back to home
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="py-24 lg:py-32">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
          <h1 className="text-5xl lg:text-6xl font-bold text-white mb-6">
            About Invoplus
          </h1>
          <p className="text-xl text-slate-400 leading-relaxed">
            We're building the future of invoice management and cash flow optimization for modern businesses.
          </p>
        </div>
      </div>

      {/* Story */}
      <div className="py-24 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
              <p className="text-slate-400 mb-4 leading-relaxed">
                Invoplus was founded with a mission to solve one of the biggest challenges facing businesses: getting paid on time.
              </p>
              <p className="text-slate-400 mb-4 leading-relaxed">
                We believe that invoicing shouldn't be complicated, and businesses shouldn't have to wait months to get paid. That's why we built a platform that combines beautiful invoicing, instant funding, and a marketplace for growth.
              </p>
              <p className="text-slate-400 leading-relaxed">
                Today, thousands of businesses use Invoplus to manage their cash flow and grow faster.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="text-4xl font-bold text-violet-400 mb-2">50K+</div>
                <p className="text-slate-400 text-sm">Invoices Powered</p>
              </div>
              <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="text-4xl font-bold text-amber-400 mb-2">$1.2B</div>
                <p className="text-slate-400 text-sm">Financed</p>
              </div>
              <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="text-4xl font-bold text-emerald-400 mb-2">15K+</div>
                <p className="text-slate-400 text-sm">Active Users</p>
              </div>
              <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50">
                <div className="text-4xl font-bold text-blue-400 mb-2">100+</div>
                <p className="text-slate-400 text-sm">Team Members</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="py-24 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <h2 className="text-3xl font-bold text-white mb-12 text-center">Our Values</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50">
              <Zap className="w-12 h-12 text-violet-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Speed & Simplicity</h3>
              <p className="text-slate-400">
                We believe software should be fast and easy to use. Complexity is the enemy of adoption.
              </p>
            </div>
            <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50">
              <Shield className="w-12 h-12 text-violet-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Trust & Security</h3>
              <p className="text-slate-400">
                Your data is sacred. We use bank-level security to protect every transaction.
              </p>
            </div>
            <div className="p-8 rounded-xl border border-slate-800 bg-slate-900/50">
              <Users className="w-12 h-12 text-violet-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-3">Customer Focus</h3>
              <p className="text-slate-400">
                Everything we build is driven by customer feedback and real business needs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="py-24 border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Join thousands of businesses</h2>
          <p className="text-slate-400 mb-8">Start managing your invoices and cash flow better today.</p>
          <Link
            href="/dashboard"
            className="inline-block bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  )
}
