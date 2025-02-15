/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#646cff',
          hover: '#535bf2',
          light: 'rgba(100, 108, 255, 0.1)',
        },
        text: '#213547',
        background: '#ffffff',
        border: '#ddd',
        shadow: 'rgba(0, 0, 0, 0.1)',
      },
      zIndex: {
        'max': '999999',
      },
    },
  },
  plugins: [],
} 