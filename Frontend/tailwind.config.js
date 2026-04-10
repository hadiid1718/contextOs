/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      fontSize: {
        'display-1': ['2rem', { lineHeight: '1.2', fontWeight: '600' }],
        'title-1': ['1.375rem', { lineHeight: '1.3', fontWeight: '600' }],
        'panel': ['0.9375rem', { lineHeight: '1.5', fontWeight: '600' }],
        body: ['0.8125rem', { lineHeight: '1.6', fontWeight: '400' }],
        'label-sm': ['0.75rem', { lineHeight: '1.5', fontWeight: '500' }],
      },
      colors: {
        bg: '#0a0d14',
        bg2: '#10141f',
        bg3: '#161b2a',
        surface: '#1c2235',
        surface2: '#222840',
        accent: '#6378ff',
        accent2: '#00e5c0',
        accent3: '#ff6b9d',
        accent4: '#f0a500',
        accent5: '#a855f7',
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f0a500',
        text: '#e8ecf8',
        text2: '#8b94b8',
        text3: '#5a6485',
        'text-primary': '#e8ecf8',
        'text-secondary': '#8b94b8',
        border: 'rgba(99, 120, 255, 0.13)',
        'border-strong': 'rgba(99, 120, 255, 0.25)',
        brand: {
          DEFAULT: '#6378ff',
          dark: '#4d63ef',
          light: 'rgba(99, 120, 255, 0.18)',
        },
      },
    },
  },
  plugins: [],
};

