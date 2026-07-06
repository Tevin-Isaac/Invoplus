import Image from 'next/image'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Features } from '@/components/landing/Features'
import { Footer } from '@/components/landing/Footer'
import { Target, Eye, Gem, Check } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <Hero />
      <HowItWorks />

      <main className="space-y-12">
        <section id="platform" className="px-6 py-16 md:px-10 bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
          <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1fr_1fr] items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">platform</p>
              <h2 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">Invoice flow built for cash-sensitive teams.</h2>
              <p className="mt-6 max-w-xl text-slate-600 dark:text-slate-300 leading-8">
                Automate invoicing, unlock faster funding, and centralize customer payments in a secure workspace designed for steady growth.
              </p>
              <div className="mt-8 space-y-4">
                {[
                  { title: 'Instant invoice creation', text: 'Generate invoices and submit them to Canton Network in seconds.' },
                  { title: 'Real-time status tracking', text: 'Track invoice lifecycle from pending to verified, bidding, and funded.' },
                  { title: 'Risk-aware financing', text: 'Every invoice gets a deterministic 0–100 score and A–D grade before listing.' },
                  { title: 'Audit-grade security', text: 'Every step — verify, list, bid, settle — is a real transaction on Canton.' },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3.5 h-3.5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl">
              <Image
                src="/paid.png"
                alt="Invoice paid notification — payment received"
                width={1536}
                height={1024}
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </section>

        <Features />

        <section id="company" className="px-6 py-16 md:px-10 bg-white text-slate-950 dark:bg-slate-950 dark:text-white relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-1/4 left-0 w-[400px] h-[400px] rounded-full bg-slate-100 dark:bg-slate-800/20 -translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] rounded-full bg-slate-100 dark:bg-slate-800/20 translate-x-1/2 blur-3xl" />
          
          <div className="max-w-6xl mx-auto relative">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 mb-6">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">COMPANY</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-slate-950 dark:text-white">Built to help finance teams work smarter.</h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-8">
                Invoplus combines billing, collections, and funding intelligence in one polished platform so your business can move faster without sacrificing control.
              </p>
            </div>
            
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                { title: 'Mission', description: 'Empower businesses with tools that simplify financial operations and accelerate growth.', icon: Target },
                { title: 'Vision', description: 'Create a world where cash flow is predictable and businesses can focus on what matters.', icon: Eye },
                { title: 'Values', description: 'Transparency, security, and customer success drive everything we build and deliver.', icon: Gem },
              ].map((item, index) => (
                <div 
                  key={item.title}
                  className="group relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-8 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                    <item.icon className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-slate-950 dark:text-white">{item.title}</h3>
                  <p className="text-slate-600 dark:text-slate-400 leading-7">{item.description}</p>
                  <div className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-slate-400 to-slate-600 dark:from-slate-600 dark:to-slate-400 group-hover:w-full transition-all duration-500" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="support" className="px-6 py-16 md:px-10 bg-slate-100 text-slate-950 dark:bg-slate-900 dark:text-white relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-slate-200/40 dark:bg-slate-800/30 -translate-y-1/3 translate-x-1/3 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-slate-200/30 dark:bg-slate-800/20 translate-y-1/3 -translate-x-1/3 blur-3xl" />
          
          <div className="max-w-4xl mx-auto relative">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 mb-6">
                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">SUPPORT</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-slate-950 dark:text-white">Launch with confidence.</h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-8">
                Our team is ready to help you onboard quickly, answer questions, and connect your first invoices to funding in one dashboard.
              </p>
            </div>
            
            {/* Contact CTA Card */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-10 md:p-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-slate-200/50 dark:bg-slate-800/30 -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="relative grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 uppercase tracking-[0.25em] mb-4">Ready to start?</p>
                  <p className="text-3xl md:text-4xl font-semibold text-slate-950 dark:text-white mb-3">hello@invoplus.com</p>
                  <p className="text-slate-600 dark:text-slate-400 leading-7">Have questions? We'll help you get set up and supported from day one.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 md:justify-end">
                  <a href="/dashboard" className="inline-flex items-center justify-center bg-slate-950 dark:bg-white text-white dark:text-slate-950 text-sm font-semibold rounded-full px-8 py-4 hover:opacity-90 transition shadow-lg hover:shadow-xl">
                    Open Dashboard
                  </a>
                  <a href="#platform" className="inline-flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-transparent text-slate-950 dark:text-white text-sm font-semibold rounded-full px-8 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    Learn More
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
