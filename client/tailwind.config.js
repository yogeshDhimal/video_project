/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        charcoal: {
          850: '#1a1f26',
          900: '#12161c',
          950: '#0c0f14',
        },
        teal: {
          450: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
        ice: {
          300: '#a5f3fc',
          400: '#67e8f9',
          500: '#22d3ee',
        },
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(20, 184, 166, 0.35)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.2s infinite',
        fadeUp: 'fadeUp 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
};
