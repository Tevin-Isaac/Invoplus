import type { Metadata } from 'next'
import './globals.css'
import { CantonProvider } from '@/lib/canton'

export const metadata: Metadata = {
  title: 'InvoPlus — Private Invoice Financing on Canton',
  description: 'The first private blind auction marketplace for invoice financing. Financiers compete to fund your invoices without seeing each other\'s bids. Built on Canton Network.',
  openGraph: {
    title: 'InvoPlus',
    description: 'Unlock business cash flow instantly with private invoice financing on Canton Network.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <CantonProvider>
          {children}
        </CantonProvider>
      </body>
    </html>
  )
}
