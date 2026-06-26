import type { ExpoConfig, ConfigContext } from 'expo/config';

// app.config.ts is loaded by Expo's own TypeScript runner, which does not
// resolve imports from src/ — keep this file self-contained.
export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: 'Akin',
    slug: 'akin',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'akin',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: false,
      bundleIdentifier: 'com.ourakin.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.ourakin.app',
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-localization',
      'expo-notifications',
      'expo-secure-store',
      '@sentry/react-native',
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
      posthogKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
      router: {},
      eas: {
        projectId: '41090bd6-f28a-4ffc-b139-3ba8e31287d9',
      },
      // Site URLs used by in-app legal/support links.
      legal: {
        privacyUrl: 'https://ourakin.com/privacy',
        termsUrl: 'https://ourakin.com/terms',
        guidelinesUrl: 'https://ourakin.com/community-guidelines',
        dataRequestsUrl: 'https://ourakin.com/privacy/requests',
      },
      support: {
        feedbackEmail: 'feedback@ourakin.com',
      },
    },
  };
};
