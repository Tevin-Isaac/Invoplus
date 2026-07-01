import { DollarSign, Zap, Shield, BarChart3, Lock, Users } from 'lucide-react'

const features = [
  {
    icon: DollarSign,
    title: 'Instant Funding',
    description: 'Get paid faster with our instant funding option. No more waiting for customer payments.',
  },
  {
    icon: Zap,
    title: 'Fast Invoice Creation',
    description: 'Create professional invoices in seconds with customizable templates and auto-fill.',
  },
  {
    icon: Shield,
    title: 'Secure & Reliable',
    description: 'Bank-level security with encrypted records and reliable delivery for all communications.',
  },
  {
    icon: BarChart3,
    title: 'Real-time Analytics',
    description: 'Track cash flow, outstanding invoices, and payment trends with advanced dashboards.',
  },
  {
    icon: Lock,
    title: 'Smart Marketplace',
    description: 'Connect with investors and buyers on our secure marketplace for better opportunities.',
  },
  {
    icon: Users,
    title: 'Client Portal',
    description: 'Clients can view invoices, pay online, and download receipts from a simple portal.',
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
            Everything you need to manage invoices and grow faster
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Powerful tools designed for businesses that want faster cash flow and better control.
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
