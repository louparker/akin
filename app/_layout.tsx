// Root layout — font loading, NativeWind CSS, auth state, QueryClient.
// Fonts: Source Serif 4 (display), Inter (body), JetBrains Mono (identifiers).
// These are loaded from bundled assets via expo-font.

import '../global.css';

import { useFonts } from 'expo-font';
import { Slot, SplashScreen } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Prevent auto-hide until fonts are loaded.
void SplashScreen.preventAutoHideAsync();

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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryClientProvider client={queryClient}>
        <Slot />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
