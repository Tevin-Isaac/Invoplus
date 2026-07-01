import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyJWT, authRequired } from '@/lib/auth'
import { Sidebar } from '@/components/dashboard/Sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (authRequired()) {
    const token = cookies().get('invoplus_token')?.value
    const session = token ? verifyJWT(token) : null
    if (!session?.userId) redirect('/login')
  }
  return (
    <div className="flex h-screen dashboard-shell overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
