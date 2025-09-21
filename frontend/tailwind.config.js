import forms from '@tailwindcss/forms'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'app-gradient':
          'linear-gradient(135deg, rgba(255, 215, 186, 0.9), rgba(255, 190, 210, 0.85), rgba(205, 184, 255, 0.9))',
        'glass-light': 'linear-gradient(145deg, rgba(255,255,255,0.55), rgba(255,255,255,0.25))',
      },
      colors: {
        blush: '#f9c5d5',
        lavender: '#cfd1ff',
        peach: '#ffd9c0',
        midnight: '#232946',
        accent: '#f0648c',
        mint: '#9be7c4',
      },
      boxShadow: {
        card: '0 20px 45px -25px rgba(15, 23, 42, 0.55)',
        'card-soft': 'inset 0 1px 0 rgba(255,255,255,0.6), 0 10px 30px -18px rgba(15,23,42,0.35)',
        'inner-sm': 'inset 0 1px 3px rgba(255,255,255,0.65)',
      },
      borderRadius: {
        pill: '1.75rem',
        '4xl': '2.5rem',
      },
      letterSpacing: {
        section: '0.24em',
      },
    },
  },
  plugins: [forms],
}
