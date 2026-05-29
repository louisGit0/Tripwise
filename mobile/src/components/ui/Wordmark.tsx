import { Text, type TextStyle } from 'react-native';

// verygoodtrip wordmark — "good" and the trailing period render in the brand
// accent, the rest in the supplied ink colour. Mirrors the web Wordmark.

const ACCENT = '#4D8BFF';

interface WordmarkProps {
  /** Font size in px (default 32) */
  size?: number;
  /** Ink colour for "very" / "trip" (default brand ink) */
  color?: string;
  /** Accent colour for "good" + period (default brand accent) */
  accent?: string;
  style?: TextStyle;
}

export function Wordmark({ size = 32, color = '#F0ECE4', accent = ACCENT, style }: WordmarkProps) {
  return (
    <Text
      allowFontScaling={false}
      style={[{ fontSize: size, fontWeight: '700', letterSpacing: -size * 0.04 }, style]}
    >
      <Text style={{ color }}>very</Text>
      <Text style={{ color: accent }}>good</Text>
      <Text style={{ color }}>trip</Text>
      <Text style={{ color: accent }}>.</Text>
    </Text>
  );
}
