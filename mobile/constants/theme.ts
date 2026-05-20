import { Platform } from 'react-native';

// ── Brand palette (mirrors web Tailwind config) ────────────────────────────────

export const Primary = {
  50:  '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
} as const;

// ── Semantic color tokens ──────────────────────────────────────────────────────

export const Colors = {
  light: {
    text: '#0f172a',
    textSecondary: '#64748b',
    background: '#f8fafc',
    card: '#ffffff',
    border: '#e2e8f0',
    tint: Primary[600],
    icon: '#64748b',
    tabIconDefault: '#94a3b8',
    tabIconSelected: Primary[600],
    primary: Primary[600],
    primaryLight: Primary[50],
    destructive: '#ef4444',
    success: '#16a34a',
    amber: '#d97706',
    amberBg: '#fef3c7',
    inputBg: '#ffffff',
    inputBorder: '#cbd5e1',
    placeholder: '#94a3b8',
    muted: '#f1f5f9',
    mutedFg: '#64748b',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    background: '#0f172a',
    card: '#1e293b',
    border: '#334155',
    tint: Primary[400],
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: Primary[400],
    primary: Primary[400],
    primaryLight: '#1e3a8a30',
    destructive: '#f87171',
    success: '#4ade80',
    amber: '#fbbf24',
    amberBg: '#78350f30',
    inputBg: '#1e293b',
    inputBorder: '#475569',
    placeholder: '#64748b',
    muted: '#1e293b',
    mutedFg: '#94a3b8',
  },
} as const;

export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;

// ── Typography ─────────────────────────────────────────────────────────────────

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    mono: 'Menlo',
  },
  android: {
    sans: 'Roboto',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    mono: 'monospace',
  },
});

export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
} as const;

// ── Spacing ────────────────────────────────────────────────────────────────────

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
} as const;

// ── Radius ─────────────────────────────────────────────────────────────────────

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;
