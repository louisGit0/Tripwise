import React from 'react';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/theme';

function TabIcon({ name, color, size = 22 }: { name: string; color: string; size?: number }) {
  // Using text-based icons since @expo/vector-icons may not be available in all build configs.
  // Replace with Ionicons or MaterialIcons once the native build is verified.
  const icons: Record<string, string> = {
    dashboard: '🗺',
    vehicles: '🚗',
    favorites: '⭐',
    settings: '⚙️',
  };
  return null; // icon rendered via tabBarLabel only — swap to <Ionicons> after native build
}

export default function TabLayout() {
  const { t } = useTranslation();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.tabIconDefault,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopColor: c.border,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: t('nav.dashboard') }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{ title: t('nav.vehicles') }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: t('nav.favorites') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('nav.settings') }}
      />
    </Tabs>
  );
}
