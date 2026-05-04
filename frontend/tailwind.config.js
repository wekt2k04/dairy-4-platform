/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
      },
      colors: {
        bg: '#07111f',
        panel: '#0d1730',
        panelSoft: '#111f3d',
        accent: '#8ddcff',
        accent2: '#77c98b',
        warn: '#f9b46b',
        danger: '#ff6b78',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(141,220,255,0.18), 0 24px 80px rgba(7,17,31,0.45)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
