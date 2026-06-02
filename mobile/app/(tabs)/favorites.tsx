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
import { Button } from '@/src/components/ui/Button';
import { SectionCard } from '@/src/components/ui/SectionCard';
import { Eyebrow } from '@/src/components/ui/Eyebrow';
import { Colors, Fonts, FontSize, FontSizes, Spacing } from '@/constants/theme';
import client from '@/src/api/client';
import type { Favorite } from '@/src/types/api';

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'dark';
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
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.container}>
      <View style={styles.headerTitle}>
        <Eyebrow>{t('nav.favorites')}</Eyebrow>
        <Text style={[styles.pageTitle, { color: c.ink }]}>{t('favorites.title')}</Text>
      </View>

      {favorites.length === 0 ? (
        <Text style={[styles.empty, { color: c.mutedText }]}>{t('favorites.empty')}</Text>
      ) : (
        favorites.map((fav) => (
          <SectionCard key={fav.id}>
            <View style={styles.favRow}>
              <View style={styles.favInfo}>
                <Text style={[styles.favName, { color: c.ink }]}>{fav.name}</Text>
                <Text style={[styles.favSub, { color: c.ink2 }]} numberOfLines={1}>
                  {fav.originLabel}
                </Text>
                <Text style={[styles.favArrow, { color: c.mutedText }]}>↓</Text>
                <Text style={[styles.favSub, { color: c.ink2 }]} numberOfLines={1}>
                  {fav.destinationLabel}
                </Text>
              </View>
              <View style={styles.favActions}>
                <Button
                  label={t('favorites.useTrip')}
                  onPress={() => handleUseTrip(fav)}
                  size="sm"
                />
                <TouchableOpacity onPress={() => handleDelete(fav.id)} style={styles.deleteBtn}>
                  <Text style={[styles.deleteLabel, { color: c.fuelGas }]}>{t('common.delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SectionCard>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing[4], gap: Spacing[3] },
  headerTitle: { gap: 2, marginTop: Spacing[2] },
  pageTitle: { fontFamily: Fonts.display, fontSize: FontSizes['2xl'], fontWeight: '700' },
  empty: {
    textAlign: 'center',
    marginTop: Spacing[8],
    fontSize: FontSizes.base,
    fontFamily: Fonts.displayRegular,
  },
  favRow: { flexDirection: 'row', gap: Spacing[3] },
  favInfo: { flex: 1, gap: 2 },
  favName: { fontFamily: Fonts.display, fontSize: FontSizes.base, fontWeight: '700', marginBottom: 4 },
  favSub: { fontFamily: Fonts.displayRegular, fontSize: FontSizes.sm },
  favArrow: { fontSize: FontSizes.xs },
  favActions: { gap: Spacing[2], alignItems: 'flex-end' },
  deleteBtn: { paddingVertical: Spacing[1], paddingHorizontal: Spacing[2] },
  deleteLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: FontSize.caption },
});
