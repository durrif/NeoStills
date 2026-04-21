// frontend/tailwind.config.ts — NeoStills Design System v4
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep: '#0E1222',
          primary: '#12172A',
          secondary: '#1A1A2E',
          tertiary: '#232846',
          hover: '#2B3156',
          card: '#161B31',
          elevated: '#202644',
          surface: '#1B203A',
          glass: 'rgba(255,255,255,0.04)',
        },
        accent: {
          DEFAULT: '#B87333',
          foreground: '#12172A',
          amber: '#B87333',
          'amber-dim': '#84522D',
          copper: '#D1A178',
          cobalt: '#4D6DA3',
          steel: '#98A6BE',
          cyan: '#22E6FF',
          foam: '#F5F7FC',
          hop: '#5C8A78',
          malt: '#D8B26D',
          danger: '#C75050',
          info: '#22E6FF',
          purple: '#46CFFF',
        },
        text: {
          primary: '#F5F7FC',
          secondary: '#ADB4CE',
          tertiary: '#6F7899',
        },
        status: {
          success: '#5C8A78',
          warning: '#D8B26D',
          danger: '#C75050',
          info: '#22E6FF',
          online: '#74D9D0',
          offline: '#68708C',
        },
        // Shadcn-compatible
        border: 'rgba(255,255,255,0.06)',
        input: '#161B31',
        ring: '#22E6FF',
        background: '#12172A',
        foreground: '#F5F7FC',
        primary: {
          DEFAULT: '#B87333',
          foreground: '#F5F7FC',
        },
        secondary: {
          DEFAULT: '#1A1A2E',
          foreground: '#F5F7FC',
        },
        destructive: {
          DEFAULT: '#C75050',
          foreground: '#F5F7FC',
        },
        muted: {
          DEFAULT: '#161B31',
          foreground: '#ADB4CE',
        },
        popover: {
          DEFAULT: '#202644',
          foreground: '#F5F7FC',
        },
        card: {
          DEFAULT: '#161B31',
          foreground: '#F5F7FC',
        },
      },
      backgroundImage: {
        'brew-gradient': 'linear-gradient(135deg, #D1A178 0%, #B87333 52%, #22E6FF 100%)',
        'copper-gradient': 'linear-gradient(135deg, #F0D4B7 0%, #D7A36E 22%, #B87333 56%, #8B5A2B 100%)',
        'magic-gradient': 'linear-gradient(135deg, #1A1A2E 0%, #22E6FF 100%)',
        'card-gradient': 'linear-gradient(145deg, #161B31 0%, #202644 100%)',
        'glass': 'linear-gradient(145deg, rgba(22,27,49,0.88) 0%, rgba(32,38,68,0.62) 100%)',
        'surface-gradient': 'linear-gradient(180deg, rgba(34,230,255,0.08) 0%, transparent 45%)',
      },
      backdropBlur: {
        glass: '16px',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        xl: 'var(--radius-xl)',
      },
      fontFamily: {
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
        display: ['Cabinet Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'base': ['0.875rem', { lineHeight: '1.5rem' }],
        'lg': ['1rem', { lineHeight: '1.5rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['2rem', { lineHeight: '2.5rem' }],
        '4xl': ['2.5rem', { lineHeight: '3rem' }],
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.32), 0 0 1px rgba(34,230,255,0.16)',
        elevated: '0 14px 42px rgba(0,0,0,0.44), 0 0 1px rgba(209,161,120,0.22)',
        copper: '0 14px 36px rgba(184,115,51,0.26), inset 0 1px 0 rgba(255,245,234,0.28)',
        glow: '0 0 22px rgba(34,230,255,0.14)',
        'glow-lg': '0 0 42px rgba(34,230,255,0.22)',
        glass: '0 8px 32px rgba(0,0,0,0.5)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'liquid-wave': 'liquid-wave 3s ease-in-out infinite',
        'pulse-amber': 'pulse-amber 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 3s ease-in-out infinite',
        'bubble-rise': 'bubble-rise 4s ease-in-out infinite',
        'fadeIn': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'liquid-wave': {
          '0%, 100%': { transform: 'translateX(-25%) translateY(0)' },
          '50%': { transform: 'translateX(25%) translateY(-5px)' },
        },
        'pulse-amber': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(34,230,255,0.32)' },
          '50%': { boxShadow: '0 0 0 8px rgba(34,230,255,0)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(34,230,255,0.1)' },
          '50%': { boxShadow: '0 0 25px rgba(34,230,255,0.24)' },
        },
        'bubble-rise': {
          '0%': { transform: 'translateY(100%) scale(0)', opacity: '0' },
          '50%': { opacity: '0.6' },
          '100%': { transform: 'translateY(-100px) scale(1.2)', opacity: '0' },
        },
        'fadeIn': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slideUp': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
