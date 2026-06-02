import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Fonts, type ThemeColors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

// Dark ink used as the LABEL color on the bright accent CTA (matches the web
// accent-button contrast — never white-on-accent).
const ACCENT_INK = '#0e0c0a';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    sizeStyles[size],
    variantContainer(variant, c),
    (disabled || loading) && styles.disabled,
    style,
  ];

  const labelColor = variantLabelColor(variant, c);
  const textStyle: StyleProp<TextStyle> = [styles.label, sizeLabel[size], { color: labelColor }];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} size="small" />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function variantContainer(variant: Variant, c: ThemeColors): ViewStyle {
  switch (variant) {
    case 'primary':
      return { backgroundColor: c.accent };
    case 'secondary':
      return { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.hairline };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'destructive':
      return { backgroundColor: c.fuelGas };
  }
}

function variantLabelColor(variant: Variant, c: ThemeColors): string {
  switch (variant) {
    case 'primary':
      return ACCENT_INK;
    case 'destructive':
      return '#ffffff';
    case 'secondary':
      return c.ink;
    case 'ghost':
      return c.accent;
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  disabled: { opacity: 0.5 },
  // Editorial display font, weight 700 only (D-11 — no 600/semibold).
  label: { fontFamily: Fonts.display, fontWeight: '700' },
});

const sizeStyles: Record<Size, ViewStyle> = {
  sm: { paddingVertical: 8, paddingHorizontal: 14 },
  md: { paddingVertical: 12, paddingHorizontal: 20 },
  lg: { paddingVertical: 16, paddingHorizontal: 28 },
};

const sizeLabel: Record<Size, TextStyle> = {
  sm: { fontSize: 13 },
  md: { fontSize: 15 },
  lg: { fontSize: 17 },
};
