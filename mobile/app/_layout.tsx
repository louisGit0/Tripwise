import '../src/i18n';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import Toast from 'react-native-toast-message';
import { AuthProvider } from '@/src/context/AuthContext';

// Keep the native splash visible until the editorial fonts are ready, so the
// first paint never flashes a fallback system font (D-11: Space Grotesk +
// JetBrains Mono, weights 400/700, NO serif). Face keys must match
// `tokens.fontFamily` (SpaceGrotesk_700Bold etc.) so atoms/screens resolve.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const scheme = useColorScheme();

  const [loaded, error] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_700Bold,
  });

  useEffect(() => {
    // Hide the splash once fonts resolve — OR fail — so a font-load error can
    // never brick the app on a blank screen (WR-03). On error we degrade to the
    // system font rather than returning null forever.
    if (loaded || error) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
      <Toast />
    </AuthProvider>
  );
}
