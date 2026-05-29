import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'verygoodtrip',
  slug: 'verygoodtrip',
  version: '1.0.0',
  scheme: 'verygoodtrip',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.verygoodtrip.app',
    usesAppleSignIn: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#181612',
    },
    package: 'com.verygoodtrip.app',
    edgeToEdgeEnabled: true,
  },
  web: {
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    'expo-web-browser',
    'expo-apple-authentication',
    [
      'expo-splash-screen',
      {
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#FAFAF7',
        dark: { backgroundColor: '#0E0C0A' },
      },
    ],
    // @rnmapbox/maps requires a dev build — not compatible with Expo Go
    // MAPBOX_DOWNLOAD_TOKEN is a secret Mapbox token (different from the public runtime token)
    // Get it at: https://account.mapbox.com → Access tokens → Secret token with DOWNLOADS:READ scope
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN ?? '',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
  },
};

export default config;
