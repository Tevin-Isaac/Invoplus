import { Header } from '@/components/dashboard/Header'
import { BarChart3 } from 'lucide-react'

export default function AnalyticsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Analytics" />
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Analytics Dashboard</h2>
          <p className="text-sm text-dark-muted max-w-sm">
            Cash flow forecasting, invoice aging, funding performance, and platform analytics — coming in the next build sprint.
          </p>
        </div>
      </div>
    </div>
  )
}
