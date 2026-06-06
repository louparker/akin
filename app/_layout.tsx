// Root layout — splash, font loading, session restore, routing decisions.
// Fonts: Source Serif 4 (display), Inter (body), JetBrains Mono (identifiers).
// These are loaded from bundled assets via expo-font.

import '../global.css';

import React, { useCallback, useEffect, useRef } from 'react';
import { useFonts } from 'expo-font';
import { Slot, SplashScreen } from 'expo-router';
import {
  Animated,
  StyleSheet,
  View,
  AccessibilityInfo,
  Settings,
  Platform,
  LogBox,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { supabase } from '@/lib/supabase';
import { ErrorBoundary } from '@/components/composed/ErrorBoundary';
import { BannedScreen } from '@/components/composed/BannedScreen';
import SuspendedScreen from '@/components/composed/SuspendedScreen';
import { track } from '@/lib/analytics';
import { initSentry } from '@/lib/sentry';
import { Text } from '@/components/primitives/Text';
import { colors } from '@/theme/colors';

// Initialise Sentry as early as possible — before the first component render.
initSentry({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  appEnv: process.env.EXPO_PUBLIC_APP_ENV ?? 'development',
});

// ── Native splash: hold until boot sequence completes ───────────────────────
void SplashScreen.preventAutoHideAsync();

// ── TanStack Query client (singleton) ───────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000, // 30 seconds
    },
    mutations: {
      retry: 0,
    },
  },
});

// ── Font map ────────────────────────────────────────────────────────────────
// Metro asset require() calls return a number (module ID) at runtime.
// The 'any' assignment is unavoidable here — expo-font accepts this shape.
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const FONTS = {
  // Source Serif 4 — display / headlines
  // TODO: Add font files to assets/fonts/ before first build.
  // Download from: https://fonts.google.com/specimen/Source+Serif+4
  'Source Serif 4': require('../assets/fonts/SourceSerif4-Regular.ttf'),
  'Source Serif 4 Italic': require('../assets/fonts/SourceSerif4-Italic.ttf'),
  // Inter — body / UI copy
  // Download from: https://fonts.google.com/specimen/Inter
  Inter: require('../assets/fonts/Inter-Regular.ttf'),
  'Inter Medium': require('../assets/fonts/Inter-Medium.ttf'),
  'Inter SemiBold': require('../assets/fonts/Inter-SemiBold.ttf'),
  // JetBrains Mono — anonymous identifiers + char counters only
  // Download from: https://www.jetbrains.com/lp/mono/
  'JetBrains Mono': require('../assets/fonts/JetBrainsMono-Regular.ttf'),
  'JetBrains Mono Medium': require('../assets/fonts/JetBrainsMono-Medium.ttf'),
};
/* eslint-enable @typescript-eslint/no-unsafe-assignment */

// ── Max splash duration (ms) ─────────────────────────────────────────────────
const MAX_SPLASH_MS = 3000;

// ── In-app splash overlay ───────────────────────────────────────────────────

interface InAppSplashProps {
  visible: boolean;
}

function InAppSplash({ visible }: InAppSplashProps) {
  const opacity = useRef(new Animated.Value(1)).current;
  const reducedMotion = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reducedMotion.current = v;
    });
  }, []);

  useEffect(() => {
    if (!visible) {
      if (reducedMotion.current) {
        opacity.setValue(0);
      } else {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      }
    }
  }, [visible, opacity]);

  return (
    <Animated.View style={[styles.splash, { opacity }]} pointerEvents="none">
      <View style={styles.splashInner}>
        <Text variant="display" style={styles.wordmark}>
          Akin
        </Text>
      </View>
    </Animated.View>
  );
}

// ── Root layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const isLoading = useAuthStore((s) => s.isLoading);
  const profile = useAuthStore((s) => s.profile);

  // initialize() is idempotent — safe to call on every mount.
  // We need the action at mount time only, so we grab it once via an arrow wrapper
  // to avoid the unbound-method lint error (Zustand actions are closures, not class methods).
  const initialize = useCallback(async () => {
    // Maestro passes `E2E: "1"` as an iOS launch argument. iOS stores launch
    // args in NSUserDefaults; RN's Settings API reads that on iOS.
    // clearState:true wipes the JS bundle but not iOS Keychain, so we sign out
    // here to ensure every E2E run starts unauthenticated.
    if (Platform.OS === 'ios' && Settings.get('E2E')) {
      // Silence the LogBox warning overlay in E2E — it sits over the tab bar and
      // blocks Maestro's accessibility scanner from finding tab buttons.
      LogBox.ignoreAllLogs();
      await supabase.auth.signOut();
    }
    return useAuthStore.getState().initialize();
  }, []);

  // showSplash: true while boot sequence is running (fonts + session restore)
  const [showSplash, setShowSplash] = React.useState(true);
  const timeoutFiredRef = useRef(false);

  const dismissSplash = useCallback(() => {
    setShowSplash(false);
    void SplashScreen.hideAsync();
  }, []);

  // Kick off auth initialisation once on mount.
  useEffect(() => {
    void initialize();
    void track('app_opened');
  }, [initialize]);

  // 3-second hard cap: boot with whatever state we have.
  useEffect(() => {
    const timer = setTimeout(() => {
      timeoutFiredRef.current = true;
      dismissSplash();
    }, MAX_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [dismissSplash]);

  // Dismiss as soon as fonts AND session are both resolved (whichever comes last).
  useEffect(() => {
    const fontsReady = fontsLoaded || fontError !== null;
    if (fontsReady && !isLoading && !timeoutFiredRef.current) {
      dismissSplash();
    }
  }, [fontsLoaded, fontError, isLoading, dismissSplash]);

  const isBanned = profile?.status === 'banned';
  const isSuspended =
    profile?.status === 'suspended' &&
    profile?.suspended_until != null &&
    new Date(profile.suspended_until) > new Date();

  function renderContent() {
    if (isBanned) return <BannedScreen />;
    if (isSuspended)
      return (
        <SuspendedScreen
          suspendedUntil={profile.suspended_until ?? ''}
          locale={profile.language === 'sv' ? 'sv' : 'en'}
        />
      );
    return <Slot />;
  }

  // SAFE-AREA RULE — read .claude/skills/ui/SKILL.md before changing.
  // The top safe-area inset is applied here ONCE for every screen in the app.
  // Screens must NOT add their own paddingTop: insets.top — that double-pads.
  // Bottom inset is handled per-screen (tab bar / sticky footers vary).
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <SafeAreaView style={styles.safeRoot} edges={['top']}>
              {renderContent()}
            </SafeAreaView>
            <InAppSplash visible={showSplash} />
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeRoot: { flex: 1, backgroundColor: colors.bg.base },
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.base,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  splashInner: {
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'Source Serif 4',
    fontSize: 44,
    // lineHeight intentionally omitted: <Text variant="display"> auto-scales
    // its lineHeight from the variant's 1.10 ratio when fontSize is overridden.
    // See src/components/primitives/Text.tsx deriveLineHeightOverride().
    letterSpacing: -0.8,
    color: colors.fg.primary,
  },
});
