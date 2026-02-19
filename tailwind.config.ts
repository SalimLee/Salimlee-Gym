import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primärfarben für Salim Lee Gym – Leuchtendes Rot mit Glow
        brand: {
          50: '#fff1f1',
          100: '#ffe0e0',
          200: '#ffc7c7',
          300: '#ffa0a0',
          400: '#ff5252', // Helles leuchtendes Rot
          500: '#ff2d2d', // Hauptfarbe – klar, leuchtend, lebendig
          600: '#e81e1e',
          700: '#c41616',
          800: '#a11414',
          900: '#861717',
        },
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
          950: '#09090b', // Hintergrund
        }
      },
      fontFamily: {
        sans: ['Barlow', 'sans-serif'],
        display: ['Barlow', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 1s ease-out',
        'fade-in-delay': 'fadeIn 1s ease-out 0.3s both',
        'slide-up': 'slideUp 0.6s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 45, 45, 0.4), 0 0 60px rgba(255, 45, 45, 0.1)' },
          '50%': { boxShadow: '0 0 30px rgba(255, 45, 45, 0.6), 0 0 80px rgba(255, 45, 45, 0.2)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'brand-gradient': 'linear-gradient(to right, #ff2d2d, #e81e1e)',
      },
    },
  },
  plugins: [],
}

export default config
