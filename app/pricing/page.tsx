'use client'

import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'

const plans = [
  {
    name: 'Starter',
    price: 'Free',
    description: 'Perfect for getting started',
    features: [
      'Up to 10 invoices/month',
      'Basic invoice templates',
      'Email notifications',
      'Client portal access',
      'Basic analytics',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Professional',
    price: '$29',
    period: '/month',
    description: 'For growing businesses',
    features: [
      'Unlimited invoices',
      'Advanced templates',
      'Instant funding access',
      'Marketplace access',
      'Advanced analytics',
      'API access',
      'Priority support',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Everything in Professional',
      'Custom integrations',
      'Dedicated account manager',
      'Custom workflows',
      'White-label options',
      'SLA guarantee',
      'Advanced security',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function PricingPage() {
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

      {/* Pricing Section */}
      <div className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="text-center mb-16">
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Choose the perfect plan for your business. Always flexible to scale.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border transition-all ${
                  plan.popular
                    ? 'border-violet-500/50 bg-gradient-to-br from-slate-900 to-slate-900/50 ring-2 ring-violet-500/20 md:scale-105'
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="p-8">
                  {plan.popular && (
                    <div className="mb-4 inline-block px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-400">
                      Most Popular
                    </div>
                  )}

                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-white">{plan.price}</span>
                    {plan.period && <span className="text-slate-400 ml-2">{plan.period}</span>}
                  </div>

                  <Link
                    href="/dashboard"
                    className={`w-full block text-center py-3 rounded-lg font-semibold transition-colors mb-8 ${
                      plan.popular
                        ? 'bg-violet-600 hover:bg-violet-700 text-white'
                        : 'border border-slate-700 text-slate-300 hover:border-slate-600 hover:text-white'
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  <ul className="space-y-4">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mt-24">
            <h2 className="text-3xl font-bold text-white text-center mb-12">Frequently asked questions</h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {[
                {
                  q: 'Can I change my plan?',
                  a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.',
                },
                {
                  q: 'Is there a free trial?',
                  a: 'Yes! Professional and Enterprise plans come with a 30-day free trial. No credit card required.',
                },
                {
                  q: 'What payment methods do you accept?',
                  a: 'We accept all major credit cards, bank transfers, and digital wallets for your convenience.',
                },
                {
                  q: 'Do you offer discounts for annual billing?',
                  a: 'Yes, get 20% off when you pay annually on Professional and Enterprise plans.',
                },
              ].map((item) => (
                <div key={item.q} className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
                  <h3 className="font-semibold text-white mb-3">{item.q}</h3>
                  <p className="text-slate-400 text-sm">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
