/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        'neon-cyan': '#00f0ff',
        'neon-purple': '#b347ea',
        'accent-red': '#ff6b6b',
        'panel': 'rgba(20,27,45,0.8)',
        'bg-primary': '#0b0f19',
        'text-primary': '#e0e0e0',
        'text-secondary': '#8892b0',
      },
      fontFamily: {
        sans: ['Manrope', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['"IBM Plex Mono"', '"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'neon': '0 0 15px rgba(0,240,255,0.15)',
        'neon-lg': '0 0 30px rgba(0,240,255,0.2)',
      },
    },
  },
  plugins: [],
};
