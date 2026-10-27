import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Salim Lee Brand – dunkelrot
        brand: {
          50: '#ffe5e5',
          100: '#ffcccc',
          200: '#ff9999',
          300: '#ff5555',
          400: '#e60000',
          500: '#b00000',
          600: '#900000',
          700: '#750000',
          800: '#5a0000',
          900: '#400000',
        },
        // Zinc palette — von der Landing Page genutzt (Dark Mode)
        dark: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
        // Admin-Theme — Voltagent-Designsprache (Dark) mit Salim-Lee-Rot als Akzent.
        // Tokens entsprechen DESIGN.md 1:1 (canvas, ink, hairline ...).
        admin: {
          canvas: '#101010',         // Page-Background (near-black)
          surface: '#101010',        // Card-Background (gleich wie canvas)
          'surface-soft': '#1a1a1a', // Inputs, code-chips, subtle fills
          'surface-mute': '#161616', // Tabelle alternating rows
          hairline: '#3d3a39',       // 1px Standard-Border
          'hairline-soft': '#2a2828',// Sehr leichte Trennlinien
          ink: '#f2f2f2',            // Default Text (off-white)
          'ink-strong': '#ffffff',   // Headlines
          body: '#bdbdbd',           // Secondary Text
          mute: '#8b949e',           // Fine print / Captions
        },
        // Semantische Status-Farben für Dark Mode (klar lesbar auf #101010)
        status: {
          success: '#4ade80',
          'success-soft': 'rgba(74, 222, 128, 0.12)',
          'success-border': 'rgba(74, 222, 128, 0.35)',
          warning: '#fbbf24',
          'warning-soft': 'rgba(251, 191, 36, 0.12)',
          'warning-border': 'rgba(251, 191, 36, 0.35)',
          danger: '#f87171',
          'danger-soft': 'rgba(248, 113, 113, 0.12)',
          'danger-border': 'rgba(248, 113, 113, 0.35)',
          info: '#60a5fa',
          'info-soft': 'rgba(96, 165, 250, 0.12)',
          'info-border': 'rgba(96, 165, 250, 0.35)',
          neutral: '#8b949e',
          'neutral-soft': 'rgba(139, 148, 158, 0.12)',
          'neutral-border': 'rgba(139, 148, 158, 0.35)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Barlow', 'Inter', 'sans-serif'], // Hero/Logo bleibt Barlow
        mono: ['SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace'],
      },
      fontSize: {
        // Voltagent-inspired type scale
        'display-xl': ['60px', { lineHeight: '60px', letterSpacing: '-0.65px', fontWeight: '400' }],
        'display-lg': ['36px', { lineHeight: '40px', letterSpacing: '-0.9px', fontWeight: '400' }],
        'display-md': ['24px', { lineHeight: '32px', letterSpacing: '-0.6px', fontWeight: '700' }],
        'display-sm': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'eyebrow': ['12px', { lineHeight: '16px', letterSpacing: '1.8px', fontWeight: '600' }],
      },
      letterSpacing: {
        'eyebrow': '2.52px',
      },
      borderRadius: {
        'card': '8px',
        'btn': '6px',
        'pill': '9999px',
      },
      animation: {
        'fade-in': 'fadeIn 1s ease-out',
        'fade-in-delay': 'fadeIn 1s ease-out 0.3s both',
        'fade-in-fast': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'slide-up-fast': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'draw-line': 'drawLine 1.2s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(176, 0, 0, 0.4), 0 0 60px rgba(176, 0, 0, 0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(176, 0, 0, 0.6), 0 0 80px rgba(176, 0, 0, 0.2)' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'brand-gradient': 'linear-gradient(to right, #b00000, #900000)',
      },
      boxShadow: {
        'card-hover': '0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)',
        'card-focus': '0 0 0 3px rgba(176, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config
