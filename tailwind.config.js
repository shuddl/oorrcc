/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './packages/frontend/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      colors: {
        dark: {
          50: '#f7f7f8',
          100: '#ececf1',
          200: '#d9d9e3',
          300: '#c5c5d2',
          400: '#9393a8',
          500: '#6b6b7b',
          600: '#4a4a5a',
          700: '#343541',
          800: '#202123',
          900: '#0f0f10',
        },
        accent: {
          50: '#f3f1ff',
          100: '#ebe5ff',
          200: '#d9ceff',
          300: '#bea6ff',
          400: '#9f75ff',
          500: '#843dff',
          600: '#7916ff',
          700: '#6b04fd',
          800: '#5a03d5',
          900: '#4b05ad',
        },
        'dark-800': '#1A1B1E',
        'dark-700': '#2A2B2E',
        'dark-600': '#3A3B3E',
        'dark-500': '#4A4B4E',
        'dark-300': '#7A7B7E',
        'h4': '#YourColorHere', // Define h4 color if needed
      }
    },
  },
  plugins: [],
};