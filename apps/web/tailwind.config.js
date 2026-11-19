/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#F7F5F0',
          dark: '#EFECE4',
          card: '#FFFFFF',
        },
        ink: {
          DEFAULT: '#1D1C1A',
          muted: '#747169',
          dim: '#9E9B93',
        },
        terracotta: {
          DEFAULT: '#C25438',
          hover: '#A9442C',
          soft: 'rgba(194, 84, 56, 0.08)',
        },
        olive: '#4E6053',
        background: '#F7F5F0',
        surface: {
          DEFAULT: '#FFFFFF',
          hover: '#F7F5F0',
          active: '#EFECE4',
        },
        border: {
          subtle: '#E5E1D8',
          muted: '#D4CEBF',
          strong: '#BDB6A4',
        },
        primary: {
          DEFAULT: '#C25438',
          hover: '#A9442C',
          50: '#FDF8F6',
          100: '#FBECE7',
          500: '#C25438',
          600: '#A9442C',
          700: '#8E3621',
        },
        accent: {
          emerald: '#4E6053',
          cyan: '#324B66',
          amber: '#C4822B',
          rose: '#C25438',
          indigo: '#46495C',
        },
      },
      spacing: {
        'safe-top': 'env(safe-area-inset-top, 0px)',
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'safe-left': 'env(safe-area-inset-left, 0px)',
        'safe-right': 'env(safe-area-inset-right, 0px)',
      },
      padding: {
        safe: 'env(safe-area-inset-bottom, 0px)',
      },
      backdropBlur: {
        xs: '2px',
      },
      fontFamily: {
        serif: [
          'Newsreader',
          'Songti SC',
          'SimSun',
          'STSong',
          'serif',
        ],
        sans: [
          'Plus Jakarta Sans',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
