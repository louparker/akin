import type { ExpoConfig, ConfigContext } from 'expo/config';
import { getEnv } from './src/lib/env';

export default ({ config }: ConfigContext): ExpoConfig => {
  // Fails the build immediately if any required env var is missing.
  // In CI, placeholder values are injected via workflow env: block.
  const env = getEnv(process.env);

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
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.ourakin.app',
    },
    plugins: ['expo-router'],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      supabaseUrl: env.supabaseUrl,
      supabaseAnonKey: env.supabaseAnonKey,
      sentryDsn: env.sentryDsn,
      posthogKey: env.posthogKey,
    },
  };
};
