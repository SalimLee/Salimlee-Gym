'use client'

import Link from 'next/link'
import { SITE_CONFIG, CONTACT_INFO } from '@/lib/constants'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-12 px-4 border-t border-brand-600/20 bg-dark-950">
      <div className="max-w-7xl mx-auto text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
          <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center font-black text-dark-950 group-hover:shadow-lg group-hover:shadow-brand-500/50 transition-all duration-300">
            SL
          </div>
          <div className="text-left">
            <div className="font-black text-lg tracking-tight">{SITE_CONFIG.shortName.toUpperCase()}</div>
            <div className="text-xs text-brand-500 tracking-widest">{SITE_CONFIG.tagline}</div>
          </div>
        </Link>

        {/* Address */}
        <p className="text-dark-400 mb-4">
          {CONTACT_INFO.address.street}, {CONTACT_INFO.address.zip} {CONTACT_INFO.address.city}
        </p>

        {/* Copyright */}
        <p className="text-sm text-dark-500">
          © {currentYear} {SITE_CONFIG.name}. Alle Rechte vorbehalten.
        </p>
      </div>
    </footer>
  )
}
