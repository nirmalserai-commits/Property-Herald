/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0a1628',
          50:  '#e8ecf4',
          100: '#c5cfdf',
          200: '#9eafc8',
          300: '#778fb1',
          400: '#5a779f',
          500: '#3d5f8d',
          600: '#2d4b7a',
          700: '#1e3868',
          800: '#112250',
          900: '#0a1628',
        },
        gold: {
          DEFAULT: '#c9a84c',
          50:  '#fdf9ee',
          100: '#f9efc8',
          200: '#f3e0a0',
          300: '#ecd076',
          400: '#e8c84c',
          500: '#c9a84c',
          600: '#b08a30',
          700: '#8d6c20',
          800: '#6a5016',
          900: '#48360e',
        },
        cream: {
          DEFAULT: '#fdf8f0',
          50:  '#fffdf9',
          100: '#fdf8f0',
          200: '#f7eddb',
          300: '#eedfc0',
        },
        'warm-gray': '#5a4a3a',
        'royal-green': '#1a7a3a',
        'burgundy': '#7a1a2a',
      },
      fontFamily: {
        serif:  ['Playfair Display', 'Georgia', 'serif'],
        sans:   ['Inter', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #c9a84c 0%, #e8c84c 50%, #c9a84c 100%)',
        'navy-gradient': 'linear-gradient(135deg, #0a1628 0%, #1e3868 100%)',
      },
    },
  },
  plugins: [],
};
