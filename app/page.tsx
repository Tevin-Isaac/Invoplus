'use client'

import { HeroPremium } from '@/components/landing/HeroPremium'
import { Features } from '@/components/landing/Features'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { ForInvestors } from '@/components/landing/ForInvestors'
import { CTA } from '@/components/landing/CTA'
import { Footer } from '@/components/landing/Footer'

export default function HomePage() {
  return (
    <div className="bg-white text-slate-900">
      <HeroPremium />
      <Features />
      <HowItWorks />
      <ForInvestors />
      <CTA />
      <Footer />
    </div>
  )
}
