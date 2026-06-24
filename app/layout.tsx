import type { Metadata } from 'next'
import './globals.css'
import { CantonProvider } from '@/lib/canton'

export const metadata: Metadata = {
  title: 'Invoplus — Fast Invoice & Payment Platform',
  description: 'Create professional invoices, send to clients, and get paid faster. Simple invoicing for freelancers and small businesses.',
  openGraph: {
    title: 'Invoplus',
    description: 'Get paid faster with professional invoicing, payment tracking, and automated reminders.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://db.onlinewebfonts.com/c/04e6981992c0e2e7642af2074ebe3901?family=Helvetica+Now+Display+Bold" rel="stylesheet" />
      </head>
      <body>
        <CantonProvider>
          {children}
        </CantonProvider>
      </body>
    </html>
  )
}
