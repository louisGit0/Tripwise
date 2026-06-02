/**
 * Canonical editorial-dark design tokens (PD5-1, MOB-03).
 *
 * Web mirrors these exact VALUES in `web/src/app/globals.css` (CSS custom
 * properties) but does NOT consume this module — the web design system is
 * locked, do not refactor it to import from here. Mobile (`mobile/constants/
 * theme.ts`) consumes THIS module as its single source of truth.
 *
 * Keep this file framework-free: ZERO imports (no `react-native`, no Tailwind),
 * so the backend/web barrel stays clean when it re-exports it. Values are plain
 * hex strings + numbers only.
 *
 * Typography discipline (D-11): Space Grotesk (display/UI) + JetBrains Mono
 * (numerics), 2 weights only (400 / 700). NO serif.
 */

export interface ThemeColorTokens {
  /** Page background. */
  bg: string;
  /** Elevation 1 (card). */
  surface: string;
  /** Elevation 2. */
  surface2: string;
  /** Elevation 3 (hero plate / modal / tooltip). */
  surface3: string;
  /** Primary text (~14:1). */
  ink: string;
  /** Secondary text (~9:1). */
  ink2: string;
  /** Muted text (AA-safe for >=14px). */
  muted: string;
  /** Faint fill. */
  faint: string;
  /** Separator / border. */
  hairline: string;
  /** Accent / link / focus. */
  accent: string;
  /** EV data-viz. */
  ev: string;
  /** Fuel (gas) data-viz. */
  fuelGas: string;
  /** Fuel (diesel) data-viz. */
  fuelDie: string;
  /** Fuel (GPL) data-viz. */
  fuelGpl: string;
  /** Toll segment (warm taupe — NOT an energy color). */
  toll: string;
}

export interface Tokens {
  colors: {
    dark: ThemeColorTokens;
    light: ThemeColorTokens;
  };
  fontFamily: {
    /** Space Grotesk 700 — display / headings / UI bold. */
    display: string;
    /** Space Grotesk 400 — display / UI regular. */
    displayRegular: string;
    /** JetBrains Mono 700 — bold numerics. */
    mono: string;
    /** JetBrains Mono 400 — regular numerics. */
    monoRegular: string;
  };
  fontWeight: {
    regular: '400';
    bold: '700';
  };
  fontSize: {
    /** Hero cost figure (web uses a clamp; mobile is narrow → 56). */
    hero: number;
    /** Large heading. */
    display: number;
    /** Body / inline numerics / labels. */
    body: number;
    /** Eyebrow / caption / meta. */
    caption: number;
  };
  spacing: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    8: number;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    card: number;
    chip: number;
    full: number;
  };
}

export const tokens: Tokens = {
  colors: {
    // Dark (default) — warm-charcoal editorial ramp. Matches globals.css :root.
    dark: {
      bg: '#0e0c0a',
      surface: '#17150f',
      surface2: '#211d16',
      surface3: '#2a251c',
      ink: '#f2efe8',
      ink2: '#c9c2b4',
      muted: '#8a8173',
      faint: '#2e2820',
      hairline: '#3a3328',
      accent: '#4d8bff',
      ev: '#4d8bff',
      fuelGas: '#ff7849',
      fuelDie: '#ffc247',
      fuelGpl: '#a78bfa',
      toll: '#b8a98c',
    },
    // Light — matches globals.css [data-theme="light"].
    light: {
      bg: '#fafaf7',
      surface: '#ffffff',
      surface2: '#f3f1ec',
      surface3: '#ece9e2',
      ink: '#1c1a16',
      ink2: '#4a463e',
      muted: '#8a8275',
      faint: '#e8e5dd',
      hairline: '#d8d4ca',
      accent: '#4d8bff',
      ev: '#4d8bff',
      fuelGas: '#ff7849',
      fuelDie: '#ffc247',
      fuelGpl: '#7c3aed',
      toll: '#9b8a6b',
    },
  },
  // Loaded-font keys @expo-google-fonts exposes (05-02 loads them). NO serif (D-11).
  fontFamily: {
    display: 'SpaceGrotesk_700Bold',
    displayRegular: 'SpaceGrotesk_400Regular',
    mono: 'JetBrainsMono_700Bold',
    monoRegular: 'JetBrainsMono_400Regular',
  },
  fontWeight: {
    regular: '400',
    bold: '700',
  },
  // RN numeric mirror of the web 4-size scale (web hero is a clamp; mobile → 56).
  fontSize: {
    hero: 56,
    display: 26,
    body: 14,
    caption: 11,
  },
  // 8-pt rhythm.
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    card: 12,
    chip: 6,
    full: 9999,
  },
};
