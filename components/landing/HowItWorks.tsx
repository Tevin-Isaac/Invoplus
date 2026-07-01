const steps = [
  {
    number: '01',
    title: 'Create Your Invoice',
    description: 'Fill in client details, services, and amounts or use one of our templates to generate a professional invoice in seconds.',
    tag: 'Easy Templates',
  },
  {
    number: '02',
    title: 'Send & Track',
    description: 'Send invoices via email or share a payment link. Track when clients view invoices and get notified on activity.',
    tag: 'Tracking',
  },
  {
    number: '03',
    title: 'Get Funded',
    description: 'Use our instant funding feature to get paid before your customers pay. Connect with investors on our marketplace.',
    tag: 'Funding',
  },
  {
    number: '04',
    title: 'Manage & Grow',
    description: 'Use reporting, analytics, and marketplace features to keep cash flow predictable and grow your business.',
    tag: 'Growth',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-full px-4 py-2 mb-6">
            <span className="text-xs text-slate-300 font-medium">HOW IT WORKS</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">
            From invoice to payment in four simple steps
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            A streamlined workflow designed for modern businesses.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-12 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px bg-gradient-to-r from-slate-800 via-violet-600 to-slate-800" />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center lg:items-start text-center lg:text-left">
                {/* Number circle */}
                <div className="relative z-10 w-12 h-12 rounded-full bg-gradient-to-br from-violet-600 to-violet-700 text-white flex items-center justify-center text-sm font-bold mb-6 shadow-lg shadow-violet-500/30">
                  {step.number}
                </div>

                {/* Tag */}
                <span className="text-xs font-semibold text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-full mb-3">
                  {step.tag}
                </span>

                <h3 className="text-lg font-bold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
