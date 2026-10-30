import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        bg: '#09090b',
        panel: '#111113',
        elevated: '#18181b',
        line: '#27272a',
        muted: '#a1a1aa',
        accent: {
          DEFAULT: '#22c55e',
          hover: '#4ade80',
          soft: 'rgba(34,197,94,0.12)',
          ink: '#052e16',
        },
      },
    },
  },
  plugins: [],
};

export default config;
