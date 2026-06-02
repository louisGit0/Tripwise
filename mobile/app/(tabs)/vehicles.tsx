import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  SectionList,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { SectionCard } from '@/src/components/ui/SectionCard';
import { Eyebrow } from '@/src/components/ui/Eyebrow';
import { Pill } from '@/src/components/ui/Pill';
import { VehicleImage } from '@/src/components/ui/VehicleImage';
import { Colors, Fonts, FontSize, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useDebounce } from '@/src/hooks/useDebounce';
import client from '@/src/api/client';
import type { UserVehicle, VehicleModel, CatalogPage } from '@/src/types/api';

// Editorial fuel badge — EV reads the accent tint, everything else neutral.
function FuelPill({ fuelType }: { fuelType: string }) {
  return (
    <Pill color={fuelType === 'ELECTRIC' ? 'accent' : 'neutral'} size="sm">
      {fuelType}
    </Pill>
  );
}

// Per-fuel consumption unit (mirrors the web showroom).
const unitFor = (fuelType: string) => (fuelType === 'ELECTRIC' ? 'kWh' : 'L');

// Dark ink label on the bright accent chip (matches the Button accent contrast).
const ACCENT_INK = '#0e0c0a';

// SHOW-03 fuel filter chips → ONE server `fuelCategory` param (mirrors the web
// fuelParams mapping). Values match the backend categoryToFuelTypes contract.
// 'all' sends no param. NO client-side filtering of the catalog items.
type FuelFilter = 'all' | 'gas' | 'diesel' | 'ev' | 'gpl';
const FUEL_FILTERS: { key: FuelFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'vehicles.fuelAll' },
  { key: 'gas', labelKey: 'vehicles.fuelGas' },
  { key: 'diesel', labelKey: 'vehicles.fuelDiesel' },
  { key: 'ev', labelKey: 'vehicles.fuelEv' },
  { key: 'gpl', labelKey: 'vehicles.fuelGpl' },
];

export default function VehiclesScreen() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'dark';
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
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Eyebrow>{t('nav.vehicles')}</Eyebrow>
          <Text style={[styles.pageTitle, { color: c.ink }]}>{t('vehicles.title')}</Text>
        </View>
        <Button label={t('vehicles.add')} onPress={() => setShowAddModal(true)} size="sm" />
      </View>

      {vehicles.length === 0 ? (
        <Text style={[styles.empty, { color: c.mutedText }]}>{t('vehicles.empty')}</Text>
      ) : (
        vehicles.map((v) => (
          <SectionCard key={v.id}>
            <View style={styles.vehicleRow}>
              <View style={styles.vehicleInfo}>
                <Text style={[styles.vehicleName, { color: c.ink }]}>
                  {v.nickname ?? `${v.vehicleModel.brand} ${v.vehicleModel.model}`}
                </Text>
                <View style={styles.vehicleMeta}>
                  <FuelPill fuelType={v.vehicleModel.fuelType} />
                  <Text style={[styles.vehicleSub, { color: c.mutedText }]}>
                    {v.vehicleModel.consumptionPer100km} {unitFor(v.vehicleModel.fuelType)}/100km
                  </Text>
                </View>
              </View>
              <View style={styles.vehicleActions}>
                <TouchableOpacity onPress={() => setEditTarget(v)} style={styles.iconBtn}>
                  <Text style={[styles.actionLabel, { color: c.ink2 }]}>{t('common.edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(v.id)} style={styles.iconBtn}>
                  <Text style={[styles.actionLabel, { color: c.fuelGas }]}>{t('common.delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SectionCard>
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
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>('all');

  // ── Server-side search + pagination state (frozen Phase-4 contract) ──────────
  const [items, setItems] = useState<VehicleModel[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [selected, setSelected] = useState<VehicleModel | null>(null);
  const [nickname, setNickname] = useState('');
  const [homePrice, setHomePrice] = useState('');
  const [publicPrice, setPublicPrice] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset to page 1 whenever the (debounced) query OR the fuel filter changes.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, fuelFilter]);

  // Server-side loader: page 1 REPLACES, page > 1 APPENDS. Deps include `page`;
  // when the query changes the reset effect sets page→1, re-running this and the
  // cleanup `cancelled` flag discards any in-flight page>1 fetch (so a lingering
  // higher page never wrongly appends after a search reset). NO client load-all.
  useEffect(() => {
    let cancelled = false;
    const isFirstPage = page === 1;
    if (!isFirstPage) setIsLoadingMore(true);
    // SHOW-03: the chip maps to ONE server param ('all' → none). Server-side
    // filtering only — the catalog `items` are never filtered client-side.
    const fuelCategory = fuelFilter === 'all' ? undefined : fuelFilter;
    client
      .get<CatalogPage>('/vehicles/catalog', {
        params: { search: debouncedSearch || undefined, page, limit: 30, fuelCategory },
      })
      .then((r) => {
        if (cancelled) return;
        const fetched = r.data.items ?? [];
        setItems((prev) => (isFirstPage ? fetched : [...prev, ...fetched]));
        setTotalPages(r.data.totalPages ?? 1);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoadingMore(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, fuelFilter, page]);

  // Group the accumulated items into brand sections (mirror the web showroom).
  const sections = useMemo(() => {
    const map = new Map<string, VehicleModel[]>();
    for (const m of items) {
      const list = map.get(m.brand);
      if (list) list.push(m);
      else map.set(m.brand, [m]);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
      .map(([title, data]) => ({ title, data }));
  }, [items]);

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
      <View style={[styles.modalContainer, { backgroundColor: c.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: c.hairline }]}>
          <Text style={[styles.modalTitle, { color: c.ink }]}>{t('vehicles.add')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeLabel, { color: c.accent }]}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>

        {!selected ? (
          <>
            {/* SHOW-03: the search is the clear primary affordance. */}
            <View style={styles.searchBlock}>
              <Eyebrow>{t('vehicles.selectModel')}</Eyebrow>
              <Input
                placeholder={t('vehicles.searchPlaceholder')}
                value={search}
                onChangeText={setSearch}
                containerStyle={{ marginTop: Spacing[2] }}
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.chipsScroll}
              contentContainerStyle={styles.chipsRow}
            >
              {FUEL_FILTERS.map((f) => {
                const active = fuelFilter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    onPress={() => setFuelFilter(f.key)}
                    activeOpacity={0.75}
                    style={[
                      styles.chip,
                      active
                        ? { backgroundColor: c.accent, borderColor: c.accent }
                        : { backgroundColor: c.surface2, borderColor: c.hairline },
                    ]}
                  >
                    <Text style={[styles.chipLabel, { color: active ? ACCENT_INK : c.ink }]}>
                      {t(f.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {items.length > 0 && (
              <Text style={[styles.resultsCount, { color: c.mutedText }]}>
                {t('vehicles.resultsCount', { loaded: items.length, total })}
              </Text>
            )}
            <SectionList
              style={styles.catalogList}
              sections={sections}
              keyExtractor={(item) => item.id}
              stickySectionHeadersEnabled={false}
              keyboardShouldPersistTaps="handled"
              renderSectionHeader={({ section }) => (
                <View style={[styles.sectionHeader, { backgroundColor: c.bg }]}>
                  <Eyebrow>{section.title}</Eyebrow>
                </View>
              )}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.catalogCard, { backgroundColor: c.surface, borderColor: c.hairline }]}
                  onPress={() => setSelected(item)}
                  activeOpacity={0.8}
                >
                  <VehicleImage
                    brand={item.brand}
                    model={item.model}
                    fuelType={item.fuelType}
                    style={styles.catalogThumb}
                  />
                  <View style={styles.catalogInfo}>
                    <Text style={[styles.catalogName, { color: c.ink }]} numberOfLines={1}>
                      {item.model}
                    </Text>
                    <View style={styles.catalogMeta}>
                      <FuelPill fuelType={item.fuelType} />
                      <Text style={[styles.catalogSub, { color: c.mutedText }]} numberOfLines={1}>
                        {item.consumptionPer100km} {unitFor(item.fuelType)}/100km
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.noResults, { color: c.mutedText }]}>
                  {t('vehicles.noResults')}
                </Text>
              }
              ListFooterComponent={
                page < totalPages ? (
                  <View style={styles.listFooter}>
                    <Button
                      label={t('vehicles.loadMore')}
                      onPress={() => setPage((p) => p + 1)}
                      loading={isLoadingMore}
                      variant="secondary"
                    />
                  </View>
                ) : null
              }
            />
          </>
        ) : (
          <ScrollView contentContainerStyle={styles.formContainer}>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
              <Text style={[styles.closeLabel, { color: c.accent }]}>← {t('common.back')}</Text>
            </TouchableOpacity>
            {/* Confirm the right car with its photo (or brand placeholder). */}
            <VehicleImage
              brand={selected.brand}
              model={selected.model}
              fuelType={selected.fuelType}
              style={styles.confirmImage}
            />
            <Text style={[styles.selectedModel, { color: c.ink }]}>
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
  const scheme = useColorScheme() ?? 'dark';
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
      <View style={[styles.modalContainer, { backgroundColor: c.bg }]}>
        <View style={[styles.modalHeader, { borderBottomColor: c.hairline }]}>
          <Text style={[styles.modalTitle, { color: c.ink }]}>{t('vehicles.editTitle')}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeLabel, { color: c.accent }]}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.formContainer}>
          <Text style={[styles.selectedModel, { color: c.ink }]}>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  headerTitle: { gap: 2 },
  pageTitle: { fontFamily: Fonts.display, fontSize: FontSizes['2xl'], fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: Spacing[8], fontSize: FontSizes.base, fontFamily: Fonts.displayRegular },
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehicleInfo: { flex: 1, gap: Spacing[2] },
  vehicleName: { fontFamily: Fonts.display, fontSize: FontSizes.base, fontWeight: '700' },
  vehicleMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  vehicleSub: { fontFamily: Fonts.mono, fontSize: FontSizes.sm },
  vehicleActions: { flexDirection: 'row', gap: Spacing[3] },
  iconBtn: { padding: Spacing[2] },
  actionLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: FontSize.caption },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontFamily: Fonts.display, fontSize: FontSizes.lg, fontWeight: '700' },
  closeLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: FontSizes.base },
  resultsCount: {
    fontFamily: Fonts.mono,
    fontSize: FontSize.caption,
    marginHorizontal: Spacing[4],
    marginTop: Spacing[2],
  },
  searchBlock: { marginHorizontal: Spacing[4], marginTop: Spacing[4] },
  chipsScroll: { flexGrow: 0, marginTop: Spacing[3] },
  chipsRow: { paddingHorizontal: Spacing[4], gap: Spacing[2], alignItems: 'center' },
  chip: { paddingVertical: 6, paddingHorizontal: Spacing[3], borderRadius: Radius.full, borderWidth: 1 },
  chipLabel: { fontFamily: Fonts.display, fontWeight: '700', fontSize: FontSize.caption, letterSpacing: 0.3 },
  catalogList: { flex: 1 },
  sectionHeader: { paddingHorizontal: Spacing[4], paddingTop: Spacing[4], paddingBottom: Spacing[2] },
  noResults: {
    fontFamily: Fonts.displayRegular,
    fontSize: FontSizes.base,
    textAlign: 'center',
    marginTop: Spacing[8],
  },
  listFooter: { padding: Spacing[4] },
  // Designed editorial-dark catalog card: leading photo thumbnail + info block.
  catalogCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[3],
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  catalogThumb: { width: 92, height: 58 },
  catalogInfo: { flex: 1, gap: Spacing[2] },
  catalogName: { fontFamily: Fonts.display, fontSize: FontSizes.base, fontWeight: '700' },
  catalogMeta: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  catalogSub: { fontFamily: Fonts.mono, fontSize: FontSizes.sm, flexShrink: 1 },
  formContainer: { padding: Spacing[4], gap: Spacing[4] },
  backBtn: { marginBottom: Spacing[2] },
  confirmImage: { width: '100%', aspectRatio: 16 / 10 },
  selectedModel: { fontFamily: Fonts.display, fontSize: FontSizes.lg, fontWeight: '700' },
});
