/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { 50: '#FFFDF9', 100: '#FAF6EE', 200: '#F3ECDF', 300: '#E7DDCB', 400: '#D6C8B0' },
        sage: {
          50: '#F2F6F0', 100: '#E4ECE0', 200: '#CADAC3', 300: '#AAC3A1', 400: '#8BA983',
          500: '#6F8F67', 600: '#587650', 700: '#465E40', 800: '#364833',
        },
        clay: {
          50: '#FDF5EE', 100: '#F9E6D5', 200: '#F2CCAC', 300: '#E9AE80', 400: '#DE925C',
          500: '#C97A44', 600: '#A86233', 700: '#854D29',
        },
        forest: { 400: '#7C9184', 500: '#61786A', 600: '#4A6253', 700: '#34503F', 800: '#27402F', 900: '#1C3125' },
        dew: { 50: '#EFF5F6', 100: '#DCEAED', 200: '#B9D4DA', 400: '#7FAAB5', 500: '#5F909C', 600: '#4A7681' },
        berry: { 50: '#F8EFEF', 400: '#B9776E', 600: '#93554D' },
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        card: '0 1px 2px rgba(39, 64, 47, 0.04), 0 4px 16px -4px rgba(39, 64, 47, 0.08)',
        lift: '0 10px 30px -10px rgba(39, 64, 47, 0.25)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'sheet-up': { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        pop: { '0%': { transform: 'scale(0.96)' }, '60%': { transform: 'scale(1.02)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.35s ease-out both',
        'sheet-up': 'sheet-up 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.25s ease-out both',
        pop: 'pop 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
