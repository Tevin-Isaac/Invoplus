const steps = [
  {
    number: '01',
    title: 'Upload Your Invoice',
    description: 'Drag and drop your invoice. Our AI reads it instantly — extracting amounts, due dates, buyer details, and generating a risk score. No manual entry.',
    tag: 'AI-Powered OCR',
  },
  {
    number: '02',
    title: 'AI Scores & Verifies',
    description: 'Fraud detection, duplicate checks, buyer risk analysis, and payment prediction — all in seconds. You get a plain-English risk report before any offer is made.',
    tag: 'Risk Engine',
  },
  {
    number: '03',
    title: 'Financiers Compete in Private',
    description: 'Invited financiers submit sealed bids on Canton Network. Each sees only their own offer — never competitors\'. You see all bids simultaneously.',
    tag: 'Canton Privacy',
  },
  {
    number: '04',
    title: 'Accept & Settle Atomically',
    description: 'Accept the best offer. The payment and invoice rights transfer happen in a single atomic Canton transaction — no settlement risk, no delays.',
    tag: 'Atomic Settlement',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block text-xs font-semibold text-violet-500 bg-violet-50 border border-violet-100 px-3 py-1.5 rounded-full mb-4">
            How It Works
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            From invoice to funded in minutes
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            A workflow designed for speed, privacy, and zero settlement risk.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-12 left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px bg-gradient-to-r from-violet-200 via-violet-400 to-violet-200" />

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative flex flex-col items-center lg:items-start text-center lg:text-left">
                {/* Number circle */}
                <div className="relative z-10 w-12 h-12 rounded-full bg-violet-500 text-white flex items-center justify-center text-sm font-bold mb-6 shadow-lg shadow-violet-200">
                  {step.number}
                </div>

                {/* Tag */}
                <span className="text-xs font-semibold text-violet-500 bg-violet-50 px-2.5 py-1 rounded-full mb-3">
                  {step.tag}
                </span>

                <h3 className="text-lg font-bold text-gray-900 mb-3">{step.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
