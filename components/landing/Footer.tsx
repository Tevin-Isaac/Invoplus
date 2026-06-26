import Link from 'next/link'
import { Logo } from '@/components/brand/Logo'

const links = {
  Product: ['How It Works', 'For Businesses', 'For Investors', 'Pricing', 'Changelog'],
  Company:  ['About', 'Blog', 'Careers', 'Press', 'Contact'],
  Legal:    ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Security'],
}

export function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-flex items-center mb-4">
              <Logo size={32} textClassName="text-lg" />
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-xs mb-6">
            The easiest way to get paid faster. Create, send, and track invoices with confidence.
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              All systems operational
            </div>
          </div>

          {/* Links */}
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">{group}</p>
              <ul className="space-y-3">
                {items.map(item => (
                  <li key={item}>
                    <Link href="#" className="text-sm text-gray-500 hover:text-white transition-colors">
                      {item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Invoplus. All rights reserved.
          </p>
          <p className="text-xs text-gray-600">
            Design By Invoplus Team
          </p>
        </div>
      </div>
    </footer>
  )
}
