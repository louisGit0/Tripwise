import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Share,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { AutocompleteInput } from '@/src/components/AutocompleteInput';
import { MapboxMap } from '@/src/components/MapboxMap';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import client from '@/src/api/client';
import type { GeoPoint, UserVehicle, TripResult } from '@/src/types/api';

type ChargingMode = 'home' | 'public' | 'mix';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
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
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.pageTitle, { color: c.text }]}>{t('dashboard.title')}</Text>

      <Card>
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
          <View>
            <Text style={[styles.label, { color: c.text }]}>{t('dashboard.vehicle')}</Text>
            {vehicles.length === 0 ? (
              <Text style={[styles.hint, { color: c.mutedFg }]}>{t('dashboard.noVehicle')}</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.vehicleRow}>
                {vehicles.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.vehicleChip,
                      {
                        backgroundColor: v.id === selectedVehicleId ? c.primary : c.muted,
                        borderColor: v.id === selectedVehicleId ? c.primary : c.border,
                      },
                    ]}
                    onPress={() => setSelectedVehicleId(v.id)}
                  >
                    <Text style={[styles.vehicleChipText, { color: v.id === selectedVehicleId ? '#fff' : c.text }]}>
                      {v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Charging mode (electric only) */}
          {isElectric && (
            <View style={styles.chargingSection}>
              <Text style={[styles.label, { color: c.text }]}>{t('dashboard.chargingMode')}</Text>
              <View style={styles.modeRow}>
                {(['home', 'public', 'mix'] as ChargingMode[]).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.modeBtn,
                      {
                        backgroundColor: chargingMode === mode ? c.primary : c.muted,
                        borderColor: chargingMode === mode ? c.primary : c.border,
                      },
                    ]}
                    onPress={() => setChargingMode(mode)}
                  >
                    <Text style={{ color: chargingMode === mode ? '#fff' : c.text, fontSize: FontSizes.sm }}>
                      {t(`dashboard.charging${mode.charAt(0).toUpperCase() + mode.slice(1)}` as never)}
                    </Text>
                  </TouchableOpacity>
                ))}
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
      </Card>

      {result && (
        <>
          <MapboxMap result={result} />

          <Card>
            <View style={styles.cardInner}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>Résultat</Text>
              <View style={styles.statRow}>
                <StatItem label={t('dashboard.distance')} value={`${result.distance.km} km`} c={c} />
                <StatItem label={t('dashboard.duration')} value={result.duration.formatted} c={c} />
                {result.cost && (
                  <StatItem label={t('dashboard.cost')} value={`${result.cost.totalCost.toFixed(2)} €`} c={c} />
                )}
              </View>

              {result.cost?.type === 'electric' && (
                <Text style={[styles.disclaimer, { color: c.mutedFg }]}>
                  {t('dashboard.disclaimerElectric')}
                </Text>
              )}

              <View style={styles.actionRow}>
                <Button label={t('dashboard.addFavorite')} onPress={() => setFavModal(true)} variant="secondary" size="sm" />
                <Button label={t('dashboard.share')} onPress={handleShare} variant="ghost" size="sm" />
              </View>
            </View>
          </Card>
        </>
      )}

      {/* Save favorite modal */}
      <Modal visible={favModal} transparent animationType="fade" onRequestClose={() => setFavModal(false)}>
        <View style={styles.overlay}>
          <Card style={styles.modalCard}>
            <View style={styles.cardInner}>
              <Text style={[styles.sectionTitle, { color: c.text }]}>{t('dashboard.addFavorite')}</Text>
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
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StatItem({ label, value, c }: { label: string; value: string; c: typeof Colors.light }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: c.mutedFg }]}>{label}</Text>
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing[4], gap: Spacing[4] },
  pageTitle: { fontSize: FontSizes['2xl'], fontWeight: '700', marginTop: Spacing[2] },
  cardInner: { gap: Spacing[4] },
  label: { fontSize: FontSizes.sm, fontWeight: '500' },
  hint: { fontSize: FontSizes.sm },
  vehicleRow: { flexDirection: 'row' },
  vehicleChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  vehicleChipText: { fontSize: FontSizes.sm, fontWeight: '500' },
  chargingSection: { gap: Spacing[2] },
  modeRow: { flexDirection: 'row', gap: Spacing[2] },
  modeBtn: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: Spacing[4] },
  stat: { flex: 1, gap: 2 },
  statLabel: { fontSize: FontSizes.xs },
  statValue: { fontSize: FontSizes.base, fontWeight: '600' },
  disclaimer: { fontSize: FontSizes.xs, lineHeight: 16 },
  actionRow: { flexDirection: 'row', gap: Spacing[2] },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing[6] },
  modalCard: { width: '100%' },
});
