/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          50: '#fdf8f3',
          100: '#f5e6d3',
          200: '#e8cba8',
          300: '#d4a574',
          400: '#c4844a',
          500: '#a66832',
          600: '#8b4513',
          700: '#6b3410',
          800: '#4a2410',
          900: '#2d1508',
        },
        leather: {
          light: '#8b6914',
          DEFAULT: '#654321',
          dark: '#3d2914',
        },
        amber: {
          warm: '#ffbf00',
          glow: '#ff9500',
        },
        parchment: '#f5f0e1',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'shelf': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.1)',
        'book': '2px 2px 8px rgba(0, 0, 0, 0.3)',
        'book-hover': '4px 4px 12px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 191, 0, 0.1)',
      },
      backgroundImage: {
        'wood-grain': "url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h100v100H0z' fill='%238b4513'/%3E%3Cpath d='M0 10h100M0 30h100M0 50h100M0 70h100M0 90h100' stroke='%236b3410' stroke-width='0.5' opacity='0.3'/%3E%3C/svg%3E\")",
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 191, 0, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 191, 0, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
