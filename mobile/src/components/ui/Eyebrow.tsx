import React from 'react';
import { StyleSheet, Text, useColorScheme, type TextStyle } from 'react-native';
import { Colors, Fonts, FontSize } from '@/constants/theme';

interface EyebrowProps {
  children: React.ReactNode;
  style?: TextStyle;
}

/**
 * Eyebrow — uppercase caption label (editorial surtitle). Display font (Space
 * Grotesk) weight 700, caption size, wide eye-tracking, muted text colour.
 * Mirrors the web `Eyebrow` atom. No serif (D-11).
 */
export function Eyebrow({ children, style }: EyebrowProps) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  return <Text style={[styles.eyebrow, { color: c.mutedText }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  eyebrow: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: FontSize.caption,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
});
