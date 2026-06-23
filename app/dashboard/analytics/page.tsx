'use client'

import { Header } from '@/components/dashboard/Header'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

const volumeData = [
  { month: 'Jan', funded: 420000, invoices: 8 },
  { month: 'Feb', funded: 680000, invoices: 12 },
  { month: 'Mar', funded: 540000, invoices: 9 },
  { month: 'Apr', funded: 920000, invoices: 16 },
  { month: 'May', funded: 1100000, invoices: 19 },
  { month: 'Jun', funded: 1380000, invoices: 24 },
]

const rateData = [
  { week: 'W1', avgAdvance: 86.2, avgAnnual: 12.4 },
  { week: 'W2', avgAdvance: 87.1, avgAnnual: 11.9 },
  { week: 'W3', avgAdvance: 87.8, avgAnnual: 11.6 },
  { week: 'W4', avgAdvance: 88.0, avgAnnual: 11.5 },
  { week: 'W5', avgAdvance: 88.4, avgAnnual: 11.3 },
  { week: 'W6', avgAdvance: 88.9, avgAnnual: 11.1 },
]

const gradeBreakdown = [
  { name: 'Grade A', value: 52, color: '#22C55E' },
  { name: 'Grade B', value: 33, color: '#6D4AFF' },
  { name: 'Grade C', value: 15, color: '#9898A6' },
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-3 text-xs shadow-xl">
      <p className="text-dark-muted mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? `$${(p.value / 1000).toFixed(0)}K` : p.value}
        </p>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Analytics" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl p-5 col-span-1">
            <p className="text-xs text-dark-muted mb-1">Total Volume Financed</p>
            <p className="text-3xl font-bold text-white">$12.8M</p>
            <p className="text-xs text-green-400 mt-1">↑ 34% year to date</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-5 col-span-1">
            <p className="text-xs text-dark-muted mb-1">Platform Fee Revenue</p>
            <p className="text-3xl font-bold text-violet-400">$128K</p>
            <p className="text-xs text-dark-muted mt-1">1% of financed volume</p>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-2xl p-5 col-span-1">
            <p className="text-xs text-dark-muted mb-1">Default Rate</p>
            <p className="text-3xl font-bold text-green-400">0.0%</p>
            <p className="text-xs text-dark-muted mt-1">Canton registry: 0 fraud detected</p>
          </div>
        </div>

        {/* Volume chart */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold text-white">Monthly Funding Volume</h3>
              <p className="text-xs text-dark-muted mt-0.5">USD disbursed to invoice sellers</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={volumeData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#252530" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: '#9898A6', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#9898A6', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v/1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="funded" name="Funded" fill="#6D4AFF" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Rates trend */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Avg Advance Rate Trend</h3>
            <p className="text-xs text-dark-muted mb-6">Improving competition drives better rates for sellers</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={rateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252530" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: '#9898A6', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[84, 92]} tick={{ fill: '#9898A6', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="avgAdvance" name="Advance %" stroke="#6D4AFF" strokeWidth={2} dot={{ fill: '#6D4AFF', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Grade breakdown */}
          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-white mb-1">Invoice Grade Distribution</h3>
            <p className="text-xs text-dark-muted mb-4">Based on AI risk scoring engine</p>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={gradeBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                    {gradeBreakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {gradeBreakdown.map(g => (
                  <div key={g.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <div>
                      <p className="text-xs font-medium text-white">{g.name}</p>
                      <p className="text-xs text-dark-muted">{g.value}% of listings</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Canton settlement stats */}
        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Canton Network Performance</h3>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Avg Settlement Time', value: '3.2s', note: 'Atomic on Canton ledger' },
              { label: 'Total Contracts Created', value: '1,248', note: 'Invoice + Bid + Funded' },
              { label: 'Registry Checks', value: '1,248', note: '0 double-finance attempts' },
              { label: 'Ledger Block', value: '3,469,812', note: 'DevNet · live' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl bg-dark-bg border border-dark-border">
                <p className="text-xs text-dark-muted mb-1">{s.label}</p>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-xs text-dark-muted mt-1">{s.note}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
