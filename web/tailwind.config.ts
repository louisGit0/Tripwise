import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Use attribute selector so dark: classes match [data-theme="dark"] on <html>
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Legacy primary palette — kept for backward compat with existing pages
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Carbon design system tokens — values served via CSS variables
        // so they adapt automatically when [data-theme] switches.
        // Note: opacity modifiers (e.g. bg-carbon-bg/50) won't work with
        // CSS-variable colors; use inline style for those rare cases.
        carbon: {
          bg:       'var(--c-bg)',
          surface:  'var(--c-surface)',
          surface2: 'var(--c-surface2)',
          ink:      'var(--c-ink)',
          ink2:     'var(--c-ink2)',
          muted:    'var(--c-muted)',
          faint:    'var(--c-faint)',
          hairline: 'var(--c-hairline)',
          accent:   'var(--c-accent)',
          ev:       'var(--c-ev)',
          fuelGas:  'var(--c-fuel-gas)',
          fuelDie:  'var(--c-fuel-die)',
        },
      },
      fontFamily: {
        // font-sans is remapped to Space Grotesk so existing pages
        // automatically benefit from the new display font.
        sans:    ['var(--font-display)', '-apple-system', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', '-apple-system', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', "'JetBrains Mono'", "'Courier New'", 'monospace'],
        // Legacy: existing pages that hard-code font-inter still compile
        inter:   ['var(--font-display)', 'sans-serif'],
      },
      letterSpacing: {
        // Tight tracking for large display headings
        'display':    '-0.03em',
        'display-lg': '-0.06em',
        // Eyebrow / mono label tracking
        'eye':        '0.14em',
        'eye-wide':   '0.16em',
      },
      borderRadius: {
        // Carbon card radius (12 px) — used as rounded-card
        'card': '0.75rem',
        // Tight radius for chips / nav items
        'chip': '0.375rem',
      },
    },
  },
  plugins: [],
};

export default config;
