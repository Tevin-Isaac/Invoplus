import Link from 'next/link'
import { TrendingUp, Eye, Layers, ArrowRight } from 'lucide-react'

export function ForInvestors() {
  return (
    <section id="investors" className="py-24 lg:py-32 bg-gray-950">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: content */}
          <div>
            <div className="inline-block text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-3 py-1.5 rounded-full mb-6">
              For Businesses &amp; Freelancers
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
              Run your business, we handle invoicing
            </h2>
            <p className="text-lg text-gray-400 mb-8 leading-relaxed">
              Send professional invoices, accept payments online, and manage cash flow from one dashboard.
            </p>

            <div className="space-y-6 mb-10">
              {[
                { icon: Eye, title: 'Easy Client Management', desc: 'Store client profiles, payment terms, and contact info for fast invoicing.' },
                { icon: Layers, title: 'Automatic Reconciliation', desc: 'Payments are matched to invoices automatically so your books stay clean.' },
                { icon: TrendingUp, title: 'Grow Revenue', desc: 'Scheduled invoices and reminders improve cash flow and reduce late payments.' },
              ].map((item, i) => {
                const Icon = item.icon
                return (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-1">{item.title}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <Link href="/dashboard"
              className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors group">
              Start Invoicing
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Right: mock portfolio card */}
          <div className="glass rounded-3xl p-6 border border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Portfolio Value</p>
                <p className="text-3xl font-bold text-white">$842,500</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Expected Yield</p>
                <p className="text-2xl font-bold text-green-400">+8.4%</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {[
                { name: 'TechCorp Invoice #2847', grade: 'A+', amount: '$125,000', rate: '7.2%', days: 32 },
                { name: 'RetailCo Invoice #1193', grade: 'A',  amount: '$89,400',  rate: '8.1%', days: 45 },
                { name: 'ManufacCo Invoice #0891', grade: 'B+', amount: '$220,000', rate: '9.8%', days: 28 },
              ].map((inv, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                      inv.grade === 'A+' ? 'bg-green-500/20 text-green-400' :
                      inv.grade === 'A'  ? 'bg-blue-500/20 text-blue-400' :
                                          'bg-yellow-500/20 text-yellow-400'
                    }`}>{inv.grade}</span>
                    <div>
                      <p className="text-xs font-medium text-white">{inv.name}</p>
                      <p className="text-xs text-gray-500">{inv.days} days remaining</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-white">{inv.amount}</p>
                    <p className="text-xs text-green-400">{inv.rate} yield</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Active Bids', value: '12' },
                { label: 'Avg Grade', value: 'A' },
                { label: 'Default Rate', value: '0.3%' },
              ].map(s => (
                <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-white">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
