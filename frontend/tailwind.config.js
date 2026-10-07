/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'theme-video-bg': '#F9FAFB',
        'theme-music-bg': '#E0F7FA',
        'theme-primary-video': '#1E3A8A', // Blu scuro
        'theme-primary-music': '#3B82F6', // Blu elettrico
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
