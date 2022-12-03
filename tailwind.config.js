/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#333',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      screens: {
        dark: { raw: '(prefers-color-scheme: dark)' },
      },
    },
  },
  variants: {
    textColor: ['dark'],
    backgroundColor: ['dark'],
  },
  daisyui: {
    themes: ['lofi, black'],
  },
  plugins: [require('daisyui')],
};
