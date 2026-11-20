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
        canvas: '#F3EFE7',
        alabaster: '#FAF8F4',
        linen: '#EAE4D8',
        paper: {
          DEFAULT: '#F3EFE7',
          dark: '#EAE4D8',
          card: '#FAF8F4',
        },
        ink: {
          DEFAULT: '#161513',
          secondary: '#57534C',
          muted: '#787268',
          dim: '#9B9488',
        },
        rule: {
          DEFAULT: '#DDD6C9',
          strong: '#C4BBA9',
          subtle: '#E8E2D6',
        },
        seal: {
          DEFAULT: '#9A3F2B',
          hover: '#7E3120',
          soft: 'rgba(154, 63, 43, 0.08)',
        },
        terracotta: {
          DEFAULT: '#9A3F2B',
          hover: '#7E3120',
          soft: 'rgba(154, 63, 43, 0.08)',
        },
        moss: {
          DEFAULT: '#3D4E42',
          hover: '#2F3D33',
          soft: 'rgba(61, 78, 66, 0.09)',
        },
        olive: '#3D4E42',
        obsidian: '#11100F',
        background: '#F3EFE7',
        surface: {
          DEFAULT: '#FAF8F4',
          hover: '#F3EFE7',
          active: '#EAE4D8',
        },
        border: {
          subtle: '#DDD6C9',
          muted: '#C4BBA9',
          strong: '#A99F8C',
        },
        primary: {
          DEFAULT: '#9A3F2B',
          hover: '#7E3120',
          50: '#FAF4F2',
          100: '#F3E3DE',
          500: '#9A3F2B',
          600: '#7E3120',
          700: '#652618',
        },
        accent: {
          emerald: '#3D4E42',
          cyan: '#324B66',
          amber: '#9A6B2F',
          rose: '#9A3F2B',
          indigo: '#424554',
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
        display: [
          'Cormorant Garamond',
          'Noto Serif SC',
          'Songti SC',
          'STSong',
          'Georgia',
          'serif',
        ],
        serif: [
          'Noto Serif SC',
          'Cormorant Garamond',
          'Source Han Serif SC',
          'Songti SC',
          'STSong',
          'Georgia',
          'serif',
        ],
        sans: [
          'Inter',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          '-apple-system',
          'BlinkMacSystemFont',
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
      transitionTimingFunction: {
        gallery: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      animation: {
        'pulse-subtle': 'pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
