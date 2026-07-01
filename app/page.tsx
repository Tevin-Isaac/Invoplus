import { Hero } from '@/components/landing/Hero'
import { Footer } from '@/components/landing/Footer'

export default function HomePage() {
  return (
    <div className="bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <Hero />

      <main className="space-y-28">
        <section id="platform" className="px-6 py-24 md:px-10 bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
          <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1.2fr_0.8fr] items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">platform</p>
              <h2 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">Invoice flow built for cash-sensitive teams.</h2>
              <p className="mt-6 max-w-xl text-slate-600 dark:text-slate-300 leading-8">
                Automate invoicing, unlock faster funding, and centralize customer payments in a secure workspace designed for steady growth.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { title: 'Instant invoice creation', text: 'Generate polished invoices and send them to customers in seconds.' },
                { title: 'Automated collections', text: 'Set reminders, track payment status, and keep every invoice moving.' },
                { title: 'Risk-aware financing', text: 'Access financing confidently with transparent invoice scoring.' },
                { title: 'Audit-grade security', text: 'Every payment and funding event is recorded with strong controls.' },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="px-6 py-24 md:px-10 bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">features</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">Everything your business needs to keep cash flow visible.</h2>
            <div className="mt-16 grid gap-6 lg:grid-cols-3">
              {[
                { title: 'Payment tracking', description: 'See where every invoice sits, who owes you, and when payments arrive.' },
                { title: 'Transparent funding', description: 'Know funding costs before you commit and close cash gaps with confidence.' },
                { title: 'Secure customer portal', description: 'Clients can view invoices, pay online, and download receipts from one place.' },
              ].map((item) => (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-950">
                  <h3 className="text-2xl font-semibold mb-4 text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-7">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="company" className="px-6 py-24 md:px-10 bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">company</p>
            <h2 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">Built to help finance teams work smarter.</h2>
            <p className="mt-6 text-slate-600 dark:text-slate-300 leading-8">
              Invoplus combines billing, collections, and funding intelligence in one polished platform so your business can move faster without sacrificing control.
            </p>
          </div>
        </section>

        <section id="support" className="px-6 py-24 md:px-10 bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white">
          <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[0.9fr_0.7fr] items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">support</p>
              <h2 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">Launch with confidence.</h2>
              <p className="mt-6 text-slate-600 dark:text-slate-300 leading-8">
                Our team is ready to help you onboard quickly, answer questions, and connect your first invoices to funding in one dashboard.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <a href="/dashboard" className="inline-flex items-center justify-center bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-sm font-semibold rounded-full px-6 py-3 hover:opacity-90 transition">
                  Open Dashboard
                </a>
                <a href="#platform" className="inline-flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-transparent text-slate-950 dark:text-white text-sm font-semibold rounded-full px-6 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                  Learn More
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-white p-10 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em]">Ready to start?</p>
              <p className="mt-4 text-2xl font-semibold text-slate-950 dark:text-white">hello@invoplus.com</p>
              <p className="mt-3 text-slate-600 dark:text-slate-400 leading-7 mb-5">Have questions? We will help you get set up and supported from day one.</p>
              <a href="/dashboard" className="block w-full text-center bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-sm font-semibold rounded-full px-6 py-3 hover:opacity-90 transition">
                Connect Wallet
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
