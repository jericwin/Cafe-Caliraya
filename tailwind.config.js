/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        ink: { 950: '#0b0d10', 900: '#111418', 850: '#161a1f', 800: '#1c2128', 700: '#262c35', 600: '#343c47', 500: '#4a5361', 400: '#6b7585', 300: '#98a1b0', 200: '#c4cad4', 100: '#e6e9ee' },
        amber: { 300: '#f8cf8b', 400: '#f2b45e', 500: '#e8963a', 600: '#c8742a' },
      },
    },
  },
  plugins: [],
};
