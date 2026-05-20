import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, FontSizes, Radius, Spacing } from '@/constants/theme';
import { useDebounce } from '@/src/hooks/useDebounce';
import client from '@/src/api/client';
import type { GeocodeFeature, GeoPoint } from '@/src/types/api';

interface AutocompleteInputProps {
  label: string;
  placeholder: string;
  value: GeoPoint | null;
  onChange: (point: GeoPoint | null) => void;
}

export function AutocompleteInput({ label, placeholder, value, onChange }: AutocompleteInputProps) {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [query, setQuery] = useState(value?.label ?? '');
  const [results, setResults] = useState<GeocodeFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [showList, setShowList] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  React.useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([]);
      setShowList(false);
      return;
    }
    if (value && debouncedQuery === value.label) return;

    setLoading(true);
    client
      .get<GeocodeFeature[]>('/trips/geocode', { params: { q: debouncedQuery, country: 'fr', limit: 5 } })
      .then((r) => {
        setResults(r.data);
        setShowList(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (feature: GeocodeFeature) => {
      const point: GeoPoint = {
        lat: feature.center[1],
        lng: feature.center[0],
        label: feature.place_name,
      };
      setQuery(feature.place_name);
      setShowList(false);
      setResults([]);
      onChange(point);
    },
    [onChange],
  );

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (!text) onChange(null);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: c.inputBg, borderColor: c.inputBorder },
        ]}
      >
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder={placeholder}
          placeholderTextColor={c.placeholder}
          value={query}
          onChangeText={handleChangeText}
          returnKeyType="search"
          autoCorrect={false}
        />
        {loading && <ActivityIndicator size="small" color={c.primary} style={styles.spinner} />}
      </View>

      {showList && results.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: c.card, borderColor: c.border }]}>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, { borderBottomColor: c.border }]}
                onPress={() => handleSelect(item)}
              >
                <Text style={[styles.itemText, { color: c.text }]} numberOfLines={1}>
                  {item.place_name}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {showList && results.length === 0 && !loading && (
        <View style={[styles.dropdown, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.noResult, { color: c.mutedFg }]}>
            {t('dashboard.noGeocodeResults')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 10 },
  label: { fontSize: FontSizes.sm, fontWeight: '500', marginBottom: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
  },
  input: { flex: 1, fontSize: FontSizes.base },
  spinner: { marginLeft: Spacing[2] },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: Radius.md,
    maxHeight: 200,
    zIndex: 100,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    marginTop: 2,
  },
  item: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  itemText: { fontSize: FontSizes.sm },
  noResult: { padding: Spacing[3], fontSize: FontSizes.sm },
});
