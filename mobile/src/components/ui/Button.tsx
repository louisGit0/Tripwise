import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

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
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const containerStyle: ViewStyle[] = [
    styles.base,
    sizeStyles[size],
    variantContainer(variant, c),
    (disabled || loading) && styles.disabled,
    style ?? {},
  ];

  const textStyle: TextStyle[] = [
    styles.label,
    sizeLabel[size],
    variantLabel(variant, c),
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : c.primary} size="small" />
      ) : (
        <Text style={textStyle}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

function variantContainer(variant: Variant, c: typeof Colors.light): ViewStyle {
  switch (variant) {
    case 'primary':
      return { backgroundColor: c.primary };
    case 'secondary':
      return { backgroundColor: c.muted, borderWidth: 1, borderColor: c.border };
    case 'ghost':
      return { backgroundColor: 'transparent' };
    case 'destructive':
      return { backgroundColor: c.destructive };
  }
}

function variantLabel(variant: Variant, c: typeof Colors.light): TextStyle {
  switch (variant) {
    case 'primary':
    case 'destructive':
      return { color: '#fff' };
    case 'secondary':
      return { color: c.text };
    case 'ghost':
      return { color: c.primary };
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
  label: { fontWeight: '600' },
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
