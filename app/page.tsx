import { Navbar }      from '@/components/landing/Navbar'
import { Hero }        from '@/components/landing/Hero'
import { HowItWorks }  from '@/components/landing/HowItWorks'
import { Features }    from '@/components/landing/Features'
import { ForInvestors } from '@/components/landing/ForInvestors'
import { CTA }         from '@/components/landing/CTA'
import { Footer }      from '@/components/landing/Footer'

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <HowItWorks />
      <Features />
      <ForInvestors />
      <CTA />
      <Footer />
    </main>
  )
}
