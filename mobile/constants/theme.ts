// Editorial-dark theme for the mobile app.
//
// Source of truth: the framework-free shared token module
// (`shared/src/tokens.ts`, PD5-1 / MOB-03). This file ADAPTS those canonical
// hex values into a single RN `ThemeColors` shape — light and dark share the
// EXACT same interface, which is what resolves the pre-existing `Colors[scheme]`
// union tsc errors (the old light/dark objects had divergent literal shapes).
//
// `ThemeColors` is intentionally a SUPERSET: it carries both the NEW editorial
// keys AND every LEGACY key the un-restyled screens/atoms still read, so nothing
// breaks before the per-screen restyles (05-04..07). Legacy keys are remapped to
// editorial tokens (see the mapping comment in `makeColors`).
//
// NOTE on the `muted` collision: editorial `muted` is a TEXT color (#8a8173)
// but the LEGACY `muted` key was a surface FILL (e.g. Button "secondary" bg).
// We keep `muted` = surface2 (fill, legacy semantics) and expose the editorial
// muted TEXT color as `mutedText`. Restyle plans should migrate to `mutedText`
// (text) + `surface2` (fill), then the legacy aliases can be dropped.

import { tokens } from '../../shared/src/tokens';

export type ColorScheme = 'light' | 'dark';

// Single shape shared by light + dark — superset of editorial + legacy keys.
export interface ThemeColors {
  // ── Editorial tokens (canonical) ──────────────────────────────────────────
  bg: string;
  surface: string;
  surface2: string;
  surface3: string;
  ink: string;
  ink2: string;
  /** Editorial muted TEXT color (#8a8173). NOT a fill — see `muted`. */
  mutedText: string;
  faint: string;
  hairline: string;
  accent: string;
  ev: string;
  fuelGas: string;
  fuelDie: string;
  fuelGpl: string;
  toll: string;

  // ── Legacy aliases (remapped to editorial tokens; migrate then drop) ──────
  text: string;
  textSecondary: string;
  background: string;
  card: string;
  border: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  primary: string;
  primaryLight: string;
  destructive: string;
  success: string;
  amber: string;
  amberBg: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  /** Legacy surface FILL (= surface2). For muted TEXT use `mutedText`. */
  muted: string;
  mutedFg: string;
}

// Success/positive green is not part of the editorial palette (energy colors are
// reserved for data-viz), so keep a dedicated accessible green per scheme.
const SUCCESS = { dark: '#4ade80', light: '#16a34a' } as const;

function makeColors(scheme: ColorScheme): ThemeColors {
  const t = tokens.colors[scheme];
  return {
    // Editorial
    bg: t.bg,
    surface: t.surface,
    surface2: t.surface2,
    surface3: t.surface3,
    ink: t.ink,
    ink2: t.ink2,
    mutedText: t.muted, // editorial muted TEXT (#8a8173)
    faint: t.faint,
    hairline: t.hairline,
    accent: t.accent,
    ev: t.ev,
    fuelGas: t.fuelGas,
    fuelDie: t.fuelDie,
    fuelGpl: t.fuelGpl,
    toll: t.toll,

    // Legacy → editorial remap
    text: t.ink, //              textSecondary → ink2
    textSecondary: t.ink2,
    background: t.bg,
    card: t.surface,
    border: t.hairline,
    tint: t.accent,
    icon: t.muted, //            muted text/icon
    tabIconDefault: t.muted,
    tabIconSelected: t.accent,
    primary: t.accent,
    primaryLight: t.surface2,
    destructive: t.fuelGas,
    success: SUCCESS[scheme],
    amber: t.fuelDie,
    amberBg: t.surface2,
    inputBg: t.surface,
    inputBorder: t.hairline,
    placeholder: t.muted,
    muted: t.surface2, //        legacy FILL (collision resolution)
    mutedFg: t.ink2,
  };
}

// Both schemes share the SAME `ThemeColors` type → `Colors[scheme]` is one type.
export const Colors: Record<ColorScheme, ThemeColors> = {
  light: makeColors('light'),
  dark: makeColors('dark'),
};

// ── Typography (editorial — Space Grotesk + JetBrains Mono, 2 weights) ──────
// Sourced from the shared token module. NO serif (D-11).
export const Fonts = tokens.fontFamily;

// Numeric font weights (400 / 700 only).
export const FontWeights = tokens.fontWeight;

// Editorial 4-size scale (hero/display/body/caption) sourced from the shared
// tokens — exposed here so atoms/screens read it via the aliased
// `@/constants/theme` (the `@verygoodtrip/shared` alias does not resolve at
// Metro runtime — see 05-01). Additive: the legacy `FontSizes` below is intact.
export const FontSize = tokens.fontSize;

// Legacy UI size scale consumed by existing screens (xs..2xl). Preserved so the
// un-restyled screens keep compiling; the editorial 4-size scale lives on
// `tokens.fontSize` (hero/display/body/caption) for the restyle plans.
export const FontSizes = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
} as const;

// ── Spacing + Radius (sourced from shared tokens) ───────────────────────────
export const Spacing = tokens.spacing;
export const Radius = tokens.radius;
