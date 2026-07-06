import Image from 'next/image'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Features } from '@/components/landing/Features'
import { ContactForm } from '@/components/landing/ContactForm'
import { Footer } from '@/components/landing/Footer'
import { Check } from 'lucide-react'

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
                Upload an invoice, get it risk-scored, and list it for financiers to bid on — all through
                one dashboard connected directly to Canton Network.
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

        <section id="support" className="px-6 py-14 md:px-10 bg-slate-100 dark:bg-slate-900">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 items-center">
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 order-2 md:order-1">
              <Image src="/support.png" alt="Support" width={1536} height={1024} className="w-full h-auto object-cover" />
            </div>
            <div className="order-1 md:order-2">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 mb-3">Support</p>
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-950 dark:text-white mb-2">
                Questions? Send us a message.
              </h2>
              <a href="mailto:support@invoplus.xyz" className="text-sm text-violet-600 dark:text-violet-400 hover:underline mb-4 inline-block">
                support@invoplus.xyz
              </a>
              <div className="mt-4">
                <ContactForm />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
