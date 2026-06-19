import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy:  { DEFAULT: '#0A1628', 800: '#0f1f38', 700: '#152847', 600: '#1a3460' },
        cyan:  { DEFAULT: '#22D3EE', dim: '#0e8fa3' },
        green: { DEFAULT: '#4ADE80', dim: '#22a74f' },
        gold:  { DEFAULT: '#F59E0B', dim: '#b57308' },
        cream: '#F5EFE0',
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        body:    ['Nunito', 'sans-serif'],
      },
      animation: {
        'pulse-slow':    'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':     'spin 8s linear infinite',
        'float':         'float 4s ease-in-out infinite',
        'streak':        'streak 0.6s ease-out forwards',
        'mission-flash': 'mission-flash 0.4s ease-out',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        streak: {
          '0%':   { transform: 'translateX(-100%) scaleX(0)', opacity: '1' },
          '100%': { transform: 'translateX(200%) scaleX(1)', opacity: '0' },
        },
        'mission-flash': {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.3' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
