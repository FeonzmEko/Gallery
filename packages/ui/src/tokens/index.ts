/**
 * Design Tokens for Personal Archive UI
 */

export const colors = {
  primary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  },
  neutral: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
} as const;

export const zIndex = {
  base: 0,
  card: 1,
  sticky: 10,
  header: 20,
  dropdown: 30,
  drawer: 40,
  modalBackdrop: 50,
  modalContent: 51,
  toast: 60,
  tooltip: 70,
} as const;

export const transitions = {
  default: 'transition-all duration-200 ease-in-out',
  fast: 'transition-all duration-100 ease-in-out',
  slow: 'transition-all duration-300 ease-in-out',
} as const;
