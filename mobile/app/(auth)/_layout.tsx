import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

export default function AuthLayout() {
  const scheme = useColorScheme() ?? 'dark';
  const c = Colors[scheme];
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bg },
      }}
    />
  );
}
