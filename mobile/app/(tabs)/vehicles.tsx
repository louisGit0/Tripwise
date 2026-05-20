import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Card } from '@/src/components/ui/Card';
import { Colors, FontSizes, Spacing } from '@/constants/theme';
import { useDebounce } from '@/src/hooks/useDebounce';
import client from '@/src/api/client';
import type { UserVehicle, VehicleModel } from '@/src/types/api';

export default function VehiclesScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [vehicles, setVehicles] = useState<UserVehicle[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<UserVehicle | null>(null);

  const loadVehicles = () =>
    client.get<UserVehicle[]>('/vehicles/me').then((r) => setVehicles(r.data)).catch(() => {});

  useEffect(() => { loadVehicles(); }, []);

  const handleDelete = (id: string) => {
    Alert.alert('', t('vehicles.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete(`/vehicles/me/${id}`);
            Toast.show({ type: 'success', text1: t('vehicles.deleteSuccess') });
            loadVehicles();
          } catch {
            Toast.show({ type: 'error', text1: t('common.error') });
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.pageTitle, { color: c.text }]}>{t('vehicles.title')}</Text>
        <Button label={t('vehicles.add')} onPress={() => setShowAddModal(true)} size="sm" />
      </View>

      {vehicles.length === 0 ? (
        <Text style={[styles.empty, { color: c.mutedFg }]}>{t('vehicles.empty')}</Text>
      ) : (
        vehicles.map((v) => (
          <Card key={v.id}>
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleInfo}>
                <Text style={[styles.vehicleName, { color: c.text }]}>
                  {v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`}
                </Text>
                <Text style={[styles.vehicleSub, { color: c.textSecondary }]}>
                  {v.vehicleModel.fuelType} · {v.vehicleModel.consumptionPer100km} L/100km
                </Text>
              </View>
              <View style={styles.vehicleActions}>
                <TouchableOpacity onPress={() => setEditTarget(v)} style={styles.iconBtn}>
                  <Text style={{ color: c.primary }}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(v.id)} style={styles.iconBtn}>
                  <Text style={{ color: c.destructive }}>🗑</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>
        ))
      )}

      <AddVehicleModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={() => { setShowAddModal(false); loadVehicles(); }}
      />
      {editTarget && (
        <EditVehicleModal
          vehicle={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); loadVehicles(); }}
        />
      )}
    </ScrollView>
  );
}

// ── Add modal ─────────────────────────────────────────────────────────────────

function AddVehicleModal({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [catalog, setCatalog] = useState<VehicleModel[]>([]);
  const [selected, setSelected] = useState<VehicleModel | null>(null);
  const [nickname, setNickname] = useState('');
  const [homePrice, setHomePrice] = useState('');
  const [publicPrice, setPublicPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    client
      .get<{ data: VehicleModel[]; total: number }>('/vehicles/catalog', {
        params: { search: debouncedSearch, limit: 20 },
      })
      .then((r) => setCatalog(r.data.data))
      .catch(() => {});
  }, [debouncedSearch]);

  const isElectric = selected?.fuelType === 'ELECTRIC';

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { vehicleModelId: selected.id, nickname: nickname || undefined };
      if (isElectric) {
        body.homeElectricityPrice = parseFloat(homePrice);
        body.publicChargingPrice = parseFloat(publicPrice);
      }
      await client.post('/vehicles/me', body);
      Toast.show({ type: 'success', text1: t('vehicles.addSuccess') });
      onSaved();
    } catch {
      Toast.show({ type: 'error', text1: t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: c.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: c.text }]}>{t('vehicles.add')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: c.primary, fontSize: FontSizes.base }}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>

        {!selected ? (
          <>
            <Input
              placeholder={t('vehicles.searchPlaceholder')}
              value={search}
              onChangeText={setSearch}
              containerStyle={{ margin: Spacing[4] }}
            />
            <FlatList
              data={catalog}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.catalogItem, { borderBottomColor: c.border }]}
                  onPress={() => setSelected(item)}
                >
                  <Text style={[styles.catalogName, { color: c.text }]}>
                    {item.brand} {item.model}
                  </Text>
                  <Text style={[styles.catalogSub, { color: c.textSecondary }]}>
                    {item.fuelType} · {item.consumptionPer100km} L/100km
                  </Text>
                </TouchableOpacity>
              )}
            />
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.formContainer}>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
              <Text style={{ color: c.primary }}>← {t('common.back')}</Text>
            </TouchableOpacity>
            <Text style={[styles.selectedModel, { color: c.text }]}>
              {selected.brand} {selected.model}
            </Text>
            <Input
              label={t('vehicles.nickname')}
              placeholder="Ma voiture"
              value={nickname}
              onChangeText={setNickname}
            />
            {isElectric && (
              <>
                <Input
                  label={t('vehicles.homePrice')}
                  placeholder="0.22"
                  keyboardType="decimal-pad"
                  value={homePrice}
                  onChangeText={setHomePrice}
                />
                <Input
                  label={t('vehicles.publicPrice')}
                  placeholder="0.45"
                  keyboardType="decimal-pad"
                  value={publicPrice}
                  onChangeText={setPublicPrice}
                />
              </>
            )}
            <Button
              label={t('common.save')}
              onPress={handleSave}
              loading={saving}
              disabled={isElectric ? !homePrice || !publicPrice : false}
              style={{ marginTop: Spacing[4] }}
            />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── Edit modal ─────────────────────────────────────────────────────────────────

function EditVehicleModal({ vehicle, onClose, onSaved }: { vehicle: UserVehicle; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [nickname, setNickname] = useState(vehicle.nickname ?? '');
  const [homePrice, setHomePrice] = useState(vehicle.homeElectricityPrice?.toString() ?? '');
  const [publicPrice, setPublicPrice] = useState(vehicle.publicChargingPrice?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const isElectric = vehicle.vehicleModel.fuelType === 'ELECTRIC';

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { nickname: nickname || null };
      if (isElectric) {
        body.homeElectricityPrice = parseFloat(homePrice);
        body.publicChargingPrice = parseFloat(publicPrice);
      }
      await client.patch(`/vehicles/me/${vehicle.id}`, body);
      Toast.show({ type: 'success', text1: t('vehicles.editSuccess') });
      onSaved();
    } catch {
      Toast.show({ type: 'error', text1: t('common.error') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalContainer, { backgroundColor: c.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: c.text }]}>{t('vehicles.editTitle')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={{ color: c.primary }}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={[styles.selectedModel, { color: c.text }]}>
            {vehicle.vehicleModel.brand} {vehicle.vehicleModel.model}
          </Text>
          <Input label={t('vehicles.nickname')} value={nickname} onChangeText={setNickname} />
          {isElectric && (
            <>
              <Input
                label={t('vehicles.homePrice')}
                keyboardType="decimal-pad"
                value={homePrice}
                onChangeText={setHomePrice}
              />
              <Input
                label={t('vehicles.publicPrice')}
                keyboardType="decimal-pad"
                value={publicPrice}
                onChangeText={setPublicPrice}
              />
            </>
          )}
          <Button label={t('common.save')} onPress={handleSave} loading={saving} style={{ marginTop: Spacing[4] }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing[4], gap: Spacing[3] },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { fontSize: FontSizes['2xl'], fontWeight: '700', marginTop: Spacing[2] },
  empty: { textAlign: 'center', marginTop: Spacing[8], fontSize: FontSizes.base },
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicleInfo: { flex: 1, gap: 2 },
  vehicleName: { fontSize: FontSizes.base, fontWeight: '600' },
  vehicleSub: { fontSize: FontSizes.sm },
  vehicleActions: { flexDirection: 'row', gap: Spacing[2] },
  iconBtn: { padding: Spacing[2] },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: '600' },
  catalogItem: { padding: Spacing[4], borderBottomWidth: StyleSheet.hairlineWidth },
  catalogName: { fontSize: FontSizes.base, fontWeight: '500' },
  catalogSub: { fontSize: FontSizes.sm, marginTop: 2 },
  formContainer: { padding: Spacing[4], gap: Spacing[4] },
  backBtn: { marginBottom: Spacing[2] },
  selectedModel: { fontSize: FontSizes.lg, fontWeight: '600' },
});
