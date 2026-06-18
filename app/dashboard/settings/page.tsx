import { Header } from '@/components/dashboard/Header'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Settings" />
      <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
            <Settings className="w-7 h-7 text-violet-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Settings</h2>
          <p className="text-sm text-dark-muted max-w-sm">
            Account settings, Canton party management, notification preferences, and API keys — coming in the next build sprint.
          </p>
        </div>
      </div>
    </div>
  )
}
