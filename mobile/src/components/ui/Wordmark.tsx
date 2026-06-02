import { Text, useColorScheme, type TextStyle } from 'react-native';
import { Colors, Fonts } from '@/constants/theme';

// verygoodtrip wordmark — "good" and the trailing period render in the brand
// accent, the rest in the supplied ink colour. Mirrors the web Wordmark.
// Defaults are sourced from the editorial-dark tokens (no hardcoded hex).

interface WordmarkProps {
  /** Font size in px (default 32) */
  size?: number;
  /** Ink colour for "very" / "trip" (default editorial ink for the scheme) */
  color?: string;
  /** Accent colour for "good" + period (default editorial accent) */
  accent?: string;
  style?: TextStyle;
}

export function Wordmark({ size = 32, color, accent, style }: WordmarkProps) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const ink = color ?? c.ink;
  const brand = accent ?? c.accent;

  return (
    <Text
      allowFontScaling={false}
      style={[
        { fontFamily: Fonts.display, fontSize: size, fontWeight: '700', letterSpacing: -size * 0.04 },
        style,
      ]}
    >
      <Text style={{ color: ink }}>very</Text>
      <Text style={{ color: brand }}>good</Text>
      <Text style={{ color: ink }}>trip</Text>
      <Text style={{ color: brand }}>.</Text>
    </Text>
  );
}
