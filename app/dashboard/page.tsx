import { Header } from '@/components/dashboard/Header'
import { DollarSign, FileText, Clock, TrendingUp, ArrowUpRight, CheckCircle, AlertCircle, Zap } from 'lucide-react'

const stats = [
  { label: 'Available Funding',     value: '$284,500',  change: '+12.4%', positive: true,  icon: DollarSign  },
  { label: 'Outstanding Invoices',  value: '14',        change: '+3',     positive: true,  icon: FileText    },
  { label: 'Pending Verification',  value: '3',         change: '-1',     positive: true,  icon: Clock       },
  { label: 'Total Financed (MTD)',  value: '$1.2M',     change: '+8.7%',  positive: true,  icon: TrendingUp  },
]

const recentInvoices = [
  { id: '#INV-2841', buyer: 'TechCorp Ltd',      amount: '$84,200',  status: 'funded',   grade: 'A+', offers: 4 },
  { id: '#INV-2840', buyer: 'RetailGroup Inc',   amount: '$32,100',  status: 'bidding',  grade: 'A',  offers: 2 },
  { id: '#INV-2839', buyer: 'ManuCo Systems',    amount: '$127,500', status: 'verified', grade: 'B+', offers: 0 },
  { id: '#INV-2838', buyer: 'Global Supplies',   amount: '$19,800',  status: 'funded',   grade: 'A',  offers: 3 },
  { id: '#INV-2837', buyer: 'Nexus Partners',    amount: '$55,000',  status: 'pending',  grade: '—',  offers: 0 },
]

const statusStyles: Record<string, string> = {
  funded:   'bg-green-500/15 text-green-400 border-green-500/20',
  bidding:  'bg-violet-500/15 text-violet-400 border-violet-500/20',
  verified: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  pending:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
}

export default function DashboardPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} className="bg-dark-card border border-dark-border rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-violet-400" />
                  </div>
                  <span className={`text-xs font-semibold ${s.positive ? 'text-green-400' : 'text-red-400'}`}>
                    {s.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-xs text-dark-muted">{s.label}</p>
              </div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent invoices */}
          <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl">
            <div className="flex items-center justify-between p-5 border-b border-dark-border">
              <h2 className="text-sm font-semibold text-white">Recent Invoices</h2>
              <a href="/dashboard/invoices" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                View all <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <div className="divide-y divide-dark-border">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/2 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-dark-border flex items-center justify-center text-xs font-bold text-dark-muted">
                      {inv.buyer[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{inv.buyer}</p>
                      <p className="text-xs text-dark-muted">{inv.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {inv.offers > 0 && (
                      <span className="text-xs text-violet-400">{inv.offers} offers</span>
                    )}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg border capitalize ${statusStyles[inv.status]}`}>
                      {inv.status}
                    </span>
                    <span className="text-sm font-semibold text-white w-20 text-right">{inv.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions + Canton activity */}
          <div className="space-y-4">
            <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
              <h2 className="text-sm font-semibold text-white mb-4">Quick Actions</h2>
              <div className="space-y-2">
                {[
                  { label: 'Upload Invoice', href: '/dashboard/invoices', icon: FileText },
                  { label: 'Browse Marketplace', href: '/dashboard/marketplace', icon: Zap },
                  { label: 'View My Offers', href: '/dashboard/offers', icon: CheckCircle },
                ].map(a => {
                  const Icon = a.icon
                  return (
                    <a key={a.label} href={a.href}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-border/50 hover:bg-violet-500/10 hover:border-violet-500/20 border border-transparent text-sm text-dark-muted hover:text-white transition-all group">
                      <Icon className="w-4 h-4 group-hover:text-violet-400 transition-colors" />
                      {a.label}
                    </a>
                  )
                })}
              </div>
            </div>

            {/* Canton activity */}
            <div className="bg-dark-card border border-dark-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-white">Canton Activity</h2>
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Live
                </span>
              </div>
              <div className="space-y-3">
                {[
                  { text: 'Invoice #2841 settled atomically', time: '2m ago', type: 'success' },
                  { text: 'New sealed bid received', time: '8m ago', type: 'bid' },
                  { text: 'Invoice #2839 AI verified', time: '15m ago', type: 'info' },
                  { text: 'Auction #2840 opened', time: '22m ago', type: 'auction' },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      a.type === 'success' ? 'bg-green-400' :
                      a.type === 'bid' ? 'bg-violet-400' : 'bg-blue-400'
                    }`} />
                    <div>
                      <p className="text-dark-muted">{a.text}</p>
                      <p className="text-dark-border mt-0.5">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI insights banner */}
        <div className="bg-gradient-to-r from-violet-500/10 to-violet-600/5 border border-violet-500/20 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">AI Insight</p>
            <p className="text-xs text-dark-muted">
              Invoice #2839 from ManuCo Systems is ready for the marketplace.
              Based on the buyer&apos;s payment history (A+ rating), you could expect 88–92% advance rate with 3–4 competing bids.
            </p>
          </div>
          <a href="/dashboard/marketplace"
            className="ml-auto shrink-0 text-xs font-semibold text-violet-400 hover:text-white bg-violet-500/20 hover:bg-violet-500 px-4 py-2 rounded-xl transition-all whitespace-nowrap">
            List Invoice →
          </a>
        </div>

      </div>
    </div>
  )
}
