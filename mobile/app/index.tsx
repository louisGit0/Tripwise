import React from 'react';
import { View, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { Redirect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/src/context/AuthContext';

/**
 * Anchor route for `/`.
 *
 * expo-router keeps the native splash up until an initial screen mounts. The app
 * only defines routes under the `(auth)` and `(tabs)` groups, so without this
 * file nothing matches `/` on a cold launch and a standalone (TestFlight/App
 * Store) build stays stuck on the splash. In Expo Go the AuthProvider's
 * effect-based `router.replace` masked it; release builds need a concrete `/`.
 *
 * Here we mount a minimal screen and redirect deterministically based on auth
 * state, which lets expo-router hide the splash immediately.
 */
export default function Index() {
  const { token, isLoading } = useAuth();
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  return <Redirect href={token ? '/(tabs)/dashboard' : '/(auth)/login'} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
