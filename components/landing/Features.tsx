import { Lock, Zap, Brain, ShieldCheck, BarChart3, Users } from 'lucide-react'

const features = [
  {
    icon: Lock,
    title: 'Sealed-Bid Privacy',
    description: 'Built on Canton Network — the only blockchain where financiers can compete without seeing each other\'s offers. Privacy is native, not an add-on.',
    highlight: true,
  },
  {
    icon: Zap,
    title: 'Atomic Settlement',
    description: 'Payment and invoice rights transfer in a single Canton transaction. No counterparty risk, no settlement failures, 3–10 second finality.',
    highlight: false,
  },
  {
    icon: Brain,
    title: 'AI Risk Engine',
    description: 'Instant OCR extraction, fraud detection, duplicate invoice checks, buyer payment prediction, and a plain-English confidence score on every invoice.',
    highlight: false,
  },
  {
    icon: ShieldCheck,
    title: 'Fraud Prevention',
    description: 'Canton\'s ledger proves an invoice hasn\'t been double-financed — without revealing deal terms. The first cryptographic anti-fraud registry for invoice finance.',
    highlight: false,
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    description: 'Cash flow forecasting, invoice aging, funding performance, and portfolio analytics — updated as Canton transactions confirm.',
    highlight: false,
  },
  {
    icon: Users,
    title: 'Competitive Funding',
    description: 'Multiple financiers compete for your invoice. You always see the best market rate — not just the one lender your bank happens to work with.',
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
            Why InvoPlus is different
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Traditional invoice financing is bilateral, slow, and opaque.
            InvoPlus is competitive, instant, and private.
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
