import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        peach: '#FEE4CB',
        blush: '#F9CFE4',
        lavender: '#E3D7FF',
        midnight: '#1F1B2E',
        surface: 'rgba(255,255,255,0.65)',
        border: 'rgba(255,255,255,0.45)',
        accent: '#F98080',
        accentSoft: '#FFB3C1',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.5rem',
        pill: '999px',
      },
      boxShadow: {
        card: '0 20px 45px -25px rgba(31, 27, 46, 0.45)',
        'inner-soft': 'inset 0 1px 0 rgba(255, 255, 255, 0.65)',
        glow: '0 0 0 1px rgba(255, 255, 255, 0.65)',
      },
      backgroundImage: {
        aurora: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.3) 0, rgba(255, 255, 255, 0) 45%), radial-gradient(circle at 100% 0%, rgba(255, 255, 255, 0.25) 0, rgba(255, 255, 255, 0) 40%)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease forwards',
      },
      transitionTimingFunction: {
        'soft-spring': 'cubic-bezier(0.33, 1, 0.68, 1)',
      },
    },
  },
  plugins: [forms({ strategy: 'class' })],
}
