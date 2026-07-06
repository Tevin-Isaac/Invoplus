import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Renamed in intent, not in key: every `violet-*` class across the app
        // (dashboard, landing, buttons, badges) now resolves to the InvoPlus
        // brand teal/green (#14B892 family) instead of the old purple. Kept
        // the Tailwind key as "violet" so this one file update cascades
        // everywhere without touching every component that references it.
        violet: {
          50:  '#EAFBF6',
          100: '#D2F5E9',
          200: '#A6EAD3',
          300: '#6ADFC0',
          400: '#2FCDA0',
          500: '#14B892',
          600: '#0E8C6F',
          700: '#0B6F58',
          800: '#085142',
          900: '#06392E',
        },
        dark: {
          bg:     '#0D0D0F',
          card:   '#16161A',
          border: '#252530',
          muted:  '#9898A6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-up':    'fadeUp 0.6s ease forwards',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'drift-1':    'drift1 14s ease-in-out infinite',
        'drift-2':    'drift2 18s ease-in-out infinite',
        'float':      'float 7s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Slow ambient drift for background glow blobs — gentle position +
        // scale wander so the "liquid glass" background actually moves
        // instead of sitting static behind the content.
        drift1: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(60px, 40px) scale(1.15)' },
        },
        drift2: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%':      { transform: 'translate(-50px, -30px) scale(1.1)' },
        },
        // Gentle bob + fade for the finance-icon particles in How It Works.
        float: {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.15' },
          '50%':      { transform: 'translateY(-24px)', opacity: '0.35' },
        },
      },
    },
  },
  plugins: [],
}
export default config
