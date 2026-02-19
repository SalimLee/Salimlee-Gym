'use client'

import { SITE_CONFIG } from '@/lib/constants'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="py-16 px-4 border-t border-dark-800 bg-dark-950">
      <div className="max-w-4xl mx-auto text-center">
        {/* Motto */}
        <div className="mb-8">
          <p className="text-2xl md:text-3xl font-black tracking-wider text-dark-200">
            MOTIVATION <span className="text-brand-500">·</span> RESPEKT <span className="text-brand-500">·</span> ERFOLG
          </p>
        </div>

        {/* Social Media Icons */}
        <div className="flex justify-center gap-6 mb-8">
          {/* Instagram */}
          <a
            href="https://www.instagram.com/salimleegym/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 bg-dark-800 hover:bg-brand-500/20 border border-dark-700 hover:border-brand-500/50 rounded-full flex items-center justify-center text-dark-400 hover:text-brand-500 transition-all duration-300"
            aria-label="Instagram"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
          </a>

          {/* TikTok */}
          <a
            href="https://tiktok.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 bg-dark-800 hover:bg-brand-500/20 border border-dark-700 hover:border-brand-500/50 rounded-full flex items-center justify-center text-dark-400 hover:text-brand-500 transition-all duration-300"
            aria-label="TikTok"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48v-7.13a8.16 8.16 0 004.77 1.52v-3.44a4.85 4.85 0 01-.81-.07 4.83 4.83 0 01-.38-3.87z"/>
            </svg>
          </a>

          {/* YouTube */}
          <a
            href="https://youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-12 h-12 bg-dark-800 hover:bg-brand-500/20 border border-dark-700 hover:border-brand-500/50 rounded-full flex items-center justify-center text-dark-400 hover:text-brand-500 transition-all duration-300"
            aria-label="YouTube"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
        </div>

        {/* Tagline */}
        <p className="text-lg font-bold text-dark-500 tracking-widest mb-6">
          TRAIN HARD <span className="text-brand-500/60">·</span> STAY STRONG
        </p>

        {/* Copyright */}
        <p className="text-sm text-dark-600">
          © {currentYear} {SITE_CONFIG.name}. Alle Rechte vorbehalten.
        </p>
      </div>
    </footer>
  )
}
