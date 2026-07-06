import { Lock, Zap, ShieldCheck } from 'lucide-react'

// Cross-checked against what InvoPlus actually does. The three core Canton
// guarantees — matches the hero stats and the original pillar messaging.
const features = [
  {
    icon: Lock,
    title: 'Sealed-Bid Auctions',
    description: 'Financiers bid blind. Each bid is a private Canton contract the seller cannot see until the auction closes — enforced by the ledger, not the UI.',
  },
  {
    icon: Zap,
    title: 'Atomic Settlement',
    description: 'Losing bids are rejected in their own private transactions. The winning bid becomes a dual-signed FundedInvoice in one atomic Canton transaction.',
  },
  {
    icon: ShieldCheck,
    title: 'Anti-Fraud Registry',
    description: 'A registry entry is checked before every listing — the same invoice can never be financed twice.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-2 mb-6">
            <span className="text-xs text-slate-300 font-medium">PLATFORM FEATURES</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            Everything you need to finance invoices privately
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Built on Canton Network — every guarantee below is enforced by the ledger, not application logic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={i}
                className="p-8 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-violet-500/20 transition-shadow">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
