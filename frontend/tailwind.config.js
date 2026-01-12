/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#0ea5e9',
          // ... rest of your colors
        },
      },
      // ADD THIS SECTION to make your index.css font work
      fontFamily: {
        display: ['Space Grotesk', 'Outfit', 'sans-serif'],
      },
    },
  },
  plugins: [],
}