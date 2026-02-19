import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primärfarben für Salim Lee Gym – Tiefes Rot
        brand: {
          50: '#fef2f2',
          100: '#fde8e8',
          200: '#f9c5c5',
          300: '#f09898',
          400: '#e35c5c',
          500: '#d32f2f', // Hauptfarbe – sattes, tiefes Rot
          600: '#b52525',
          700: '#961e1e',
          800: '#7c1d1d',
          900: '#681b1b',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(211, 47, 47, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(211, 47, 47, 0.6)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'brand-gradient': 'linear-gradient(to right, #d32f2f, #b52525)',
      },
    },
  },
  plugins: [],
}

export default config
