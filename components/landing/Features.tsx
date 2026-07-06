import { BarChart3, Lock, Zap, ShieldCheck, Wallet, LineChart } from 'lucide-react'

// Cross-checked against what InvoPlus actually does — no "instant funding"
// (funding happens through a sealed-bid auction, not instantly), no client
// portal (there's no debtor-facing UI at all), no "auto-fill templates"
// (the invoice form is a plain manual form). Every feature below maps to a
// real page, API route, or Daml contract in this codebase.
const features = [
  {
    icon: BarChart3,
    title: 'Deterministic Risk Scoring',
    description: 'Every invoice gets a 0–100 score and A–D grade from tenor, amount, currency, and debtor profile — computed server-side, no external API, no black box.',
  },
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
  {
    icon: LineChart,
    title: 'Live Analytics',
    description: 'Funding volume, advance rate trends, and grade distribution — computed from your actual contracts on Canton, not sample data.',
  },
  {
    icon: Wallet,
    title: 'Canton Wallet Connect',
    description: "Connect with FiveNorth's Splice Wallet — no browser extension to install, no separate account to create.",
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
