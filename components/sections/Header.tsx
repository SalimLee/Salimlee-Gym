'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X } from 'lucide-react'
import { NAV_LINKS, SITE_CONFIG } from '@/lib/constants'
import { cn } from '@/lib/utils'
import logoImage from '@/assets/logo.png'

interface HeaderProps {
  onBookingClick?: () => void
}

export function Header({ onBookingClick }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-dark-950/95 backdrop-blur-md border-b border-brand-600/20'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center group">
          <Image 
            src={logoImage} 
            alt="Salim Lee Logo" 
            className="w-auto h-16 md:h-20 transition-all duration-300 group-hover:scale-105" 
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-semibold hover:text-brand-500 transition-colors"
            >
              {link.label}
            </a>
          ))}
          {onBookingClick && (
            <button
              onClick={onBookingClick}
              className="ml-4 px-6 py-2 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-400 transition-colors"
            >
              BUCHEN
            </button>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 hover:bg-dark-800 rounded-lg transition-colors"
          aria-label="Menü"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-dark-950/98 backdrop-blur-md border-t border-brand-600/20 animate-fade-in">
          <nav className="flex flex-col p-4 gap-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="py-3 px-4 text-lg font-semibold hover:text-brand-500 hover:bg-dark-800/50 rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
            {onBookingClick && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false)
                  onBookingClick()
                }}
                className="mt-2 py-3 px-4 bg-brand-500 text-white font-bold rounded-lg hover:bg-brand-400 transition-colors"
              >
                JETZT BUCHEN
              </button>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
