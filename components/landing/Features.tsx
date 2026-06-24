import { Lock, Zap, Brain, ShieldCheck, BarChart3, Users } from 'lucide-react'

const features = [
  {
    icon: Lock,
    title: 'Create Professional Invoices',
    description: 'Beautiful, customizable invoice templates that match your brand and make you look professional.',
    highlight: true,
  },
  {
    icon: Zap,
    title: 'Fast Payments',
    description: 'Multiple payment methods and simple checkout for clients — get paid faster with less friction.',
    highlight: false,
  },
  {
    icon: Brain,
    title: 'Automated Workflows',
    description: 'Automated reminders, late-fee handling, and scheduled invoices so you spend less time chasing payments.',
    highlight: false,
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Reliable',
    description: 'Bank-level security, encrypted records, and reliable delivery for all invoice communications.',
    highlight: false,
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Track cash flow, outstanding invoices, and client payment behavior with clear dashboards.',
    highlight: false,
  },
  {
    icon: Users,
    title: 'Client Portal',
    description: 'Clients can view invoices, pay online, and download receipts from a simple portal.',
    highlight: false,
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-block text-xs font-semibold text-violet-500 bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-full mb-4">
            Platform Features
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Built for freelances and small businesses
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Invoicing that just works: faster payments, easier bookkeeping, and clear customer experiences.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className={`relative p-8 rounded-3xl border transition-all hover:-translate-y-1 hover:shadow-lg ${
                f.highlight
                  ? 'bg-violet-500 border-violet-500 text-white'
                  : 'bg-white border-gray-100 hover:border-violet-100 hover:shadow-violet-50'
              }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${
                  f.highlight ? 'bg-white/20' : 'bg-violet-50'
                }`}>
                  <Icon className={`w-6 h-6 ${f.highlight ? 'text-white' : 'text-violet-500'}`} />
                </div>
                <h3 className={`text-lg font-bold mb-3 ${f.highlight ? 'text-white' : 'text-gray-900'}`}>
                  {f.title}
                </h3>
                <p className={`text-sm leading-relaxed ${f.highlight ? 'text-white/80' : 'text-gray-500'}`}>
                  {f.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
