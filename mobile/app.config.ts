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
    // Phone-first v1.0: iPad support would require a full 12.9" iPad screenshot set at
    // App Review with no iPad-optimized layout to show. Revisit when iPad is a real target.
    supportsTablet: false,
    bundleIdentifier: 'com.verygoodtrip.app',
    usesAppleSignIn: true,
    infoPlist: {
      // The app uses only standard HTTPS (no custom/proprietary cryptography), so it
      // qualifies for the US export-compliance encryption exemption. Declaring this
      // here skips the "export compliance" question on every App Store submission.
      ITSAppUsesNonExemptEncryption: false,
    },
    // App-level privacy manifest. We do NOT track users and contact no tracking
    // domains. Required-reason API declarations (NSPrivacyAccessedAPITypes) are
    // contributed automatically by the Expo SDK 54 modules' own manifests and merged
    // at build time. The authoritative data-collection disclosure lives in the App
    // Store Connect "App Privacy" questionnaire (see 09-CONTEXT.md → App Privacy).
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
      backgroundColor: '#0e0c0a',
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
    eas: { projectId: 'c6cc2597-2473-4370-a1c4-fe53da2c881a' },
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
    mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
  },
};

export default config;
