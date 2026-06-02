import React from 'react';
import { StyleSheet, View, useColorScheme, type ViewStyle } from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { Eyebrow } from '@/src/components/ui/Eyebrow';

type Padding = 'none' | 'sm' | 'md' | 'lg';

interface SectionCardProps {
  /** Optional Eyebrow-styled title row rendered above the children. */
  title?: React.ReactNode;
  children: React.ReactNode;
  padding?: Padding;
  style?: ViewStyle;
}

/**
 * SectionCard — editorial surface card (surface bg + hairline border + card
 * radius) with an optional Eyebrow title row. Mirrors the web `SectionCard`
 * atom; the editorial counterpart of the legacy `Card`.
 */
export function SectionCard({ title, children, padding = 'md', style }: SectionCardProps) {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: c.hairline },
        paddingMap[padding],
        style,
      ]}
    >
      {title != null && (
        <View style={styles.titleRow}>
          <Eyebrow>{title}</Eyebrow>
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  titleRow: {
    marginBottom: Spacing[3],
  },
});

const paddingMap: Record<Padding, ViewStyle> = {
  none: { padding: 0 },
  sm: { padding: Spacing[3] },
  md: { padding: Spacing[4] },
  lg: { padding: Spacing[6] },
};
