import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Share,
  Modal,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { AutocompleteInput } from '@/src/components/AutocompleteInput';
import { MapboxMap } from '@/src/components/MapboxMap';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { SectionCard } from '@/src/components/ui/SectionCard';
import { Eyebrow } from '@/src/components/ui/Eyebrow';
import { Colors, Fonts, FontSizes, Spacing, type ThemeColors } from '@/constants/theme';
import client from '@/src/api/client';
import type { GeoPoint, UserVehicle, TripResult } from '@/src/types/api';

type ChargingMode = 'home' | 'public' | 'mix';

// Dark ink used on accent (light) fills — mirrors the editorial Button label.
const ON_ACCENT = '#0e0c0a';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  const params = useLocalSearchParams<{
    originLabel?: string; originLat?: string; originLng?: string;
    destinationLabel?: string; destinationLat?: string; destinationLng?: string;
    vehicleId?: string;
  }>();

  const [origin, setOrigin] = useState<GeoPoint | null>(
    params.originLat
      ? { lat: +params.originLat, lng: +params.originLng!, label: params.originLabel! }
      : null,
  );
  const [destination, setDestination] = useState<GeoPoint | null>(
    params.destinationLat
      ? { lat: +params.destinationLat, lng: +params.destinationLng!, label: params.destinationLabel! }
      : null,
  );
  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(params.vehicleId ?? '');
  const [chargingMode, setChargingMode] = useState<ChargingMode>('home');
  const [mixRatio, setMixRatio] = useState(0.5);
  const [result, setResult] = useState<TripResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [favModal, setFavModal] = useState(false);
  const [favName, setFavName] = useState('');
  const [savingFav, setSavingFav] = useState(false);

  useEffect(() => {
    client.get<UserVehicle[]>('/vehicles/me').then((r) => {
      setVehicles(r.data);
      if (!selectedVehicleId && r.data.length > 0) setSelectedVehicleId(r.data[0].id);
    }).catch(() => {});
  }, []);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);
  const isElectric = selectedVehicle?.vehicleModel.fuelType === 'ELECTRIC';

  const handleCalculate = async () => {
    if (!origin || !destination || !selectedVehicleId) return;
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = {
        origin,
        destination,
        userVehicleId: selectedVehicleId,
      };
      if (isElectric) {
        body.chargingMode = chargingMode;
        if (chargingMode === 'mix') body.chargingMixRatio = mixRatio;
      }
      const res = await client.post<TripResult>('/trips/calculate', body);
      setResult(res.data);
    } catch {
      Toast.show({ type: 'error', text1: t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    const cost = result.cost ? `${result.cost.totalCost.toFixed(2)} €` : '';
    await Share.share({
      message: t('dashboard.shareText', {
        distance: `${result.distance.km} km`,
        duration: result.duration.formatted,
        cost,
      }),
    });
  };

  const handleSaveFavorite = async () => {
    if (!origin || !destination || !favName.trim()) return;
    setSavingFav(true);
    try {
      await client.post('/favorites', {
        name: favName.trim(),
        originLabel: origin.label,
        originLat: origin.lat,
        originLng: origin.lng,
        destinationLabel: destination.label,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        vehicleId: selectedVehicleId || null,
      });
      Toast.show({ type: 'success', text1: t('favorites.saveSuccess') });
      setFavModal(false);
      setFavName('');
    } catch {
      Toast.show({ type: 'error', text1: t('favorites.saveError') });
    } finally {
      setSavingFav(false);
    }
  };

  const canCalculate = !!origin && !!destination && !!selectedVehicleId;

  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Eyebrow>verygoodtrip</Eyebrow>
        <Text style={[styles.pageTitle, { color: c.ink }]}>{t('dashboard.title')}</Text>
      </View>

      <SectionCard>
        <View style={styles.cardInner}>
          <AutocompleteInput
            label={t('dashboard.origin')}
            placeholder={t('dashboard.originPlaceholder')}
            value={origin}
            onChange={setOrigin}
          />
          <AutocompleteInput
            label={t('dashboard.destination')}
            placeholder={t('dashboard.destinationPlaceholder')}
            value={destination}
            onChange={setDestination}
          />

          {/* Vehicle picker */}
          <View style={styles.fieldGroup}>
            <Eyebrow>{t('dashboard.vehicle')}</Eyebrow>
            {vehicles.length === 0 ? (
              <Text style={[styles.hint, { color: c.mutedText }]}>{t('dashboard.noVehicle')}</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleRow}>
                {vehicles.map((v) => {
                  const active = v.id === selectedVehicleId;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.vehicleChip,
                        {
                          backgroundColor: active ? c.accent : c.surface2,
                          borderColor: active ? c.accent : c.hairline,
                        },
                      ]}
                      onPress={() => setSelectedVehicleId(v.id)}
                    >
                      <Text style={[styles.chipText, { color: active ? ON_ACCENT : c.ink }]}>
                        {v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>

          {/* Charging mode (electric only) */}
          {isElectric && (
            <View style={styles.fieldGroup}>
              <Eyebrow>{t('dashboard.chargingMode')}</Eyebrow>
              <View style={styles.modeRow}>
                {(['home', 'public', 'mix'] as ChargingMode[]).map((mode) => {
                  const active = chargingMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.modeBtn,
                        {
                          backgroundColor: active ? c.accent : c.surface2,
                          borderColor: active ? c.accent : c.hairline,
                        },
                      ]}
                      onPress={() => setChargingMode(mode)}
                    >
                      <Text style={[styles.modeBtnText, { color: active ? ON_ACCENT : c.ink }]}>
                        {t(`dashboard.charging${mode.charAt(0).toUpperCase() + mode.slice(1)}` as never)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <Button
            label={loading ? t('dashboard.calculating') : t('dashboard.calculate')}
            onPress={handleCalculate}
            loading={loading}
            disabled={!canCalculate}
          />
        </View>
      </SectionCard>

      {result && (
        <>
          <MapboxMap result={result} />

          <SectionCard title={t('dashboard.cost')}>
            <View style={styles.cardInner}>
              <View style={styles.statRow}>
                <StatItem label={t('dashboard.distance')} value={`${result.distance.km} km`} c={c} />
                <StatItem label={t('dashboard.duration')} value={result.duration.formatted} c={c} />
                {result.cost && (
                  <StatItem label={t('dashboard.cost')} value={`${result.cost.totalCost.toFixed(2)} €`} c={c} />
                )}
              </View>

              {result.cost?.type === 'electric' && (
                <View style={[styles.note, { backgroundColor: c.surface2, borderColor: c.hairline }]}>
                  <Text style={[styles.noteText, { color: c.ink2 }]}>
                    {t('dashboard.disclaimerElectric')}
                  </Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <Button label={t('dashboard.addFavorite')} onPress={() => setFavModal(true)} variant="secondary" size="sm" />
                <Button label={t('dashboard.share')} onPress={handleShare} variant="ghost" size="sm" />
              </View>
            </View>
          </SectionCard>
        </>
      )}

      {/* Save favorite modal */}
      <Modal visible={favModal} transparent animationType="fade" onRequestClose={() => setFavModal(false)}>
        <View style={styles.overlay}>
          <SectionCard style={styles.modalCard}>
            <View style={styles.cardInner}>
              <Text style={[styles.modalTitle, { color: c.ink }]}>{t('dashboard.addFavorite')}</Text>
              <Input
                label={t('favorites.nameLabel')}
                placeholder={t('favorites.namePlaceholder')}
                value={favName}
                onChangeText={setFavName}
              />
              <View style={styles.actionRow}>
                <Button label={t('common.cancel')} onPress={() => setFavModal(false)} variant="ghost" size="sm" />
                <Button
                  label={t('common.save')}
                  onPress={handleSaveFavorite}
                  loading={savingFav}
                  disabled={!favName.trim()}
                  size="sm"
                />
              </View>
            </View>
          </SectionCard>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatItem({ label, value, c }: { label: string; value: string; c: ThemeColors }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: c.mutedText }]}>{label}</Text>
      <Text style={[styles.statValue, { color: c.ink }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing[4], gap: Spacing[4] },
  header: { marginTop: Spacing[2], gap: 2 },
  pageTitle: { fontFamily: Fonts.display, fontSize: FontSizes['2xl'], fontWeight: '700' },
  cardInner: { gap: Spacing[4] },
  fieldGroup: { gap: Spacing[2] },
  hint: { fontSize: FontSizes.sm },
  vehicleRow: { flexDirection: 'row' },
  vehicleChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipText: { fontFamily: Fonts.display, fontSize: FontSizes.sm, fontWeight: '700' },
  modeRow: { flexDirection: 'row', gap: Spacing[2] },
  modeBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  modeBtnText: { fontFamily: Fonts.display, fontSize: FontSizes.sm, fontWeight: '700' },
  modalTitle: { fontFamily: Fonts.display, fontSize: FontSizes.lg, fontWeight: '700' },
  statRow: { flexDirection: 'row', gap: Spacing[4] },
  stat: { flex: 1, gap: 2 },
  statLabel: { fontSize: FontSizes.xs },
  statValue: { fontFamily: Fonts.mono, fontSize: FontSizes.base, fontWeight: '700' },
  note: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  noteText: { fontSize: FontSizes.xs, lineHeight: 16 },
  actionRow: { flexDirection: 'row', gap: Spacing[2] },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing[6] },
  modalCard: { width: '100%' },
});
