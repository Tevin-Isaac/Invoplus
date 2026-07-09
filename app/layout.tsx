import type { Metadata } from 'next'
import './globals.css'
import { CantonProvider } from '@/lib/canton'
import { AuthProvider } from '@/lib/auth-context'
import { NotificationsProvider } from '@/lib/notifications'
import { I18nProvider } from '@/lib/i18n/I18nContext'
import { AppBootSplash } from '@/components/brand/AppBootSplash'

export const metadata: Metadata = {
  title: 'Invoplus — Fast Invoice & Payment Platform',
  description: 'Create professional invoices, send to clients, and get paid faster. Simple invoicing for freelancers and small businesses.',
  icons: {
    icon: '/invoplus.png',
    shortcut: '/invoplus.png',
    apple: '/invoplus.png',
  },
  openGraph: {
    title: 'Invoplus',
    description: 'Get paid faster with professional invoicing, payment tracking, and automated reminders.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
      <body>
        <I18nProvider>
          {/* AuthProvider outside CantonProvider: the Canton context reads the
              logged-in user to auto-connect the party allocated at registration. */}
          <AuthProvider>
            <CantonProvider>
              <NotificationsProvider>
                <AppBootSplash>{children}</AppBootSplash>
              </NotificationsProvider>
            </CantonProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
