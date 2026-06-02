import React from 'react';
import { StyleSheet, Text, View, useColorScheme, type ViewStyle } from 'react-native';
import { Colors, Fonts, FontSize, Radius, Spacing, type ThemeColors } from '@/constants/theme';

type PillColor = 'success' | 'warning' | 'neutral' | 'accent';
type PillSize = 'sm' | 'md';

interface PillProps {
  children: React.ReactNode;
  color?: PillColor;
  size?: PillSize;
  style?: ViewStyle;
}

/** Append an alpha byte to a 6-digit `#RRGGBB` hex → `#RRGGBBAA`. */
function withAlpha(hex: string, alpha: number): string {
  const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

interface PillPalette {
  bg: string;
  fg: string;
}

/** Subtle tinted bg + matching text, mirroring the web Pill semantics. */
function paletteFor(color: PillColor, c: ThemeColors): PillPalette {
  switch (color) {
    case 'success':
      return { bg: withAlpha(c.success, 0.16), fg: c.success };
    case 'warning':
      return { bg: withAlpha(c.fuelDie, 0.16), fg: c.fuelDie };
    case 'accent':
      return { bg: withAlpha(c.accent, 0.16), fg: c.accent };
    case 'neutral':
    default:
      return { bg: c.surface2, fg: c.ink2 };
  }
}

const SIZE: Record<PillSize, { paddingV: number; paddingH: number; fontSize: number }> = {
  sm: { paddingV: 2, paddingH: Spacing[2], fontSize: FontSize.caption },
  md: { paddingV: 4, paddingH: Spacing[3], fontSize: FontSize.body },
};

/**
 * Pill — rounded status chip with tinted bg + matching text. Used for the
 * réel / ≈ estimé toll badge (`success` / `warning`). Mirrors the web Pill.
 * No hardcoded blue — all colours come from the editorial tokens.
 */
export function Pill({ children, color = 'neutral', size = 'md', style }: PillProps) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const { bg, fg } = paletteFor(color, c);
  const s = SIZE[size];

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: bg, paddingVertical: s.paddingV, paddingHorizontal: s.paddingH },
        style,
      ]}
    >
      <Text style={[styles.label, { color: fg, fontSize: s.fontSize }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.full,
  },
  label: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
