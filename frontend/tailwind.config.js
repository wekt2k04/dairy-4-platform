/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        dairy: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          border: 'var(--border-color)',
          text: 'var(--text-primary)',
          muted: 'var(--text-secondary)',
          accent: 'var(--accent)',
          accent2: 'var(--accent2)',
          warn: '#f9b46b',
          danger: '#ff6b78',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(141,220,255,0.18), 0 24px 80px rgba(7,17,31,0.45)',
        card: '0 4px 24px rgba(0,0,0,0.08)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pulse: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        slideIn: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
