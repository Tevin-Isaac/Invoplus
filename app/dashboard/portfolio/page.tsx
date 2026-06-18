import { Header } from '@/components/dashboard/Header'
import { TrendingUp } from 'lucide-react'

export default function PortfolioPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Portfolio" />
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Portfolio Analytics</h2>
          <p className="text-sm text-dark-muted max-w-sm">
            Full portfolio analytics — yield tracking, diversification, risk allocation, and returns — coming in the next build sprint.
          </p>
        </div>
      </div>
    </div>
  )
}
