/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-primary-light)',
          100: 'var(--brand-primary-light)',
          200: 'var(--brand-primary-light)',
          300: 'var(--brand-primary-light)',
          400: 'var(--brand-primary)',
          500: 'var(--brand-primary)',
          600: 'var(--brand-primary)',
          700: 'var(--brand-primary-hover)',
          800: 'var(--brand-primary-hover)',
          900: 'var(--brand-primary-hover)',
        }
      }
    },
  },
  plugins: [],
};
