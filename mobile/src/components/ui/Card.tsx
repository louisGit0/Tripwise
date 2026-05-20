import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useColorScheme } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';

type Padding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  padding?: Padding;
  style?: ViewStyle;
}

export function Card({ children, padding = 'md', style }: CardProps) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.card, borderColor: c.border },
        paddingMap[padding],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
});

const paddingMap: Record<Padding, ViewStyle> = {
  none: { padding: 0 },
  sm: { padding: Spacing[3] },
  md: { padding: Spacing[4] },
  lg: { padding: Spacing[6] },
};
