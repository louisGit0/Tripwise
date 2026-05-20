import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { Card } from '@/src/components/ui/Card';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import client from '@/src/api/client';
import type { Favorite } from '@/src/types/api';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const load = () =>
    client.get<Favorite[]>('/favorites').then((r) => setFavorites(r.data)).catch(() => {});

  useEffect(() => { load(); }, []);

  const handleUseTrip = (fav: Favorite) => {
    const params = new URLSearchParams({
      originLabel: fav.originLabel,
      originLat: String(fav.originLat),
      originLng: String(fav.originLng),
      destinationLabel: fav.destinationLabel,
      destinationLat: String(fav.destinationLat),
      destinationLng: String(fav.destinationLng),
      ...(fav.vehicleId ? { vehicleId: fav.vehicleId } : {}),
    });
    router.push(`/(tabs)/dashboard?${params.toString()}`);
  };

  const handleDelete = (id: string) => {
    Alert.alert('', t('favorites.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/favorites/${id}`);
            Toast.show({ type: 'success', text1: t('favorites.deleteSuccess') });
            load();
          } catch {
            Toast.show({ type: 'error', text1: t('common.error') });
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.container}>
      <Text style={[styles.pageTitle, { color: c.text }]}>{t('favorites.title')}</Text>

      {favorites.length === 0 ? (
        <Text style={[styles.empty, { color: c.mutedFg }]}>{t('favorites.empty')}</Text>
      ) : (
        favorites.map((fav) => (
          <Card key={fav.id}>
            <View style={styles.favRow}>
              <View style={styles.favInfo}>
                <Text style={[styles.favName, { color: c.text }]}>{fav.name}</Text>
                <Text style={[styles.favSub, { color: c.textSecondary }]} numberOfLines={1}>
                  {fav.originLabel}
                </Text>
                <Text style={[styles.favArrow, { color: c.mutedFg }]}>↓</Text>
                <Text style={[styles.favSub, { color: c.textSecondary }]} numberOfLines={1}>
                  {fav.destinationLabel}
                </Text>
              </View>
              <View style={styles.favActions}>
                <TouchableOpacity
                  style={[styles.useBtn, { backgroundColor: c.primary }]}
                  onPress={() => handleUseTrip(fav)}
                >
                  <Text style={styles.useBtnText}>{t('favorites.useTrip')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(fav.id)} style={styles.deleteBtn}>
                  <Text style={{ color: c.destructive }}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing[4], gap: Spacing[3] },
  pageTitle: { fontSize: FontSizes['2xl'], fontWeight: '700', marginTop: Spacing[2] },
  empty: { textAlign: 'center', marginTop: Spacing[8], fontSize: FontSizes.base },
  favRow: { flexDirection: 'row', gap: Spacing[3] },
  favInfo: { flex: 1, gap: 2 },
  favName: { fontSize: FontSizes.base, fontWeight: '600', marginBottom: 4 },
  favSub: { fontSize: FontSizes.sm },
  favArrow: { fontSize: FontSizes.xs },
  favActions: { gap: Spacing[2], alignItems: 'flex-end' },
  useBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  useBtnText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: '500' },
  deleteBtn: { padding: Spacing[1] },
});
