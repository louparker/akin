import { useState } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const { width: SCREEN_W } = Dimensions.get('window');

interface OnboardingPage {
  titleKey:
    | 'auth.onboarding.screen1.title'
    | 'auth.onboarding.screen2.title'
    | 'auth.onboarding.screen3.title';
  bodyKey:
    | 'auth.onboarding.screen1.body'
    | 'auth.onboarding.screen2.body'
    | 'auth.onboarding.screen3.body';
}

const PAGES: OnboardingPage[] = [
  { titleKey: 'auth.onboarding.screen1.title', bodyKey: 'auth.onboarding.screen1.body' },
  { titleKey: 'auth.onboarding.screen2.title', bodyKey: 'auth.onboarding.screen2.body' },
  { titleKey: 'auth.onboarding.screen3.title', bodyKey: 'auth.onboarding.screen3.body' },
];

export default function OnboardingScreen() {
  const [page, setPage] = useState(0);
  const isLoading = useAuthStore((s) => s.isLoading);

  const isLast = page === PAGES.length - 1;
  // eslint-disable-next-line security/detect-object-injection
  const current = PAGES[page];

  async function handleSkipOrFinish() {
    await useAuthStore.getState().completeOnboarding();
  }

  function handleNext() {
    if (isLast) {
      void handleSkipOrFinish();
    } else {
      setPage((p) => p + 1);
    }
  }

  if (!current) return null;

  return (
    <View style={styles.screen}>
      {/* Skip button — top-right on every screen */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => void handleSkipOrFinish()}
          accessibilityRole="button"
          accessibilityLabel={t('auth.onboarding.skip')}
          style={styles.skipHit}
        >
          <Text style={styles.skipText}>{t('auth.onboarding.skip')}</Text>
        </Pressable>
      </View>

      {/* Page content */}
      <View style={styles.content} accessibilityLiveRegion="polite">
        <Text style={styles.title}>{t(current.titleKey)}</Text>
        <Text style={styles.body}>{t(current.bodyKey)}</Text>
      </View>

      {/* Dots */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      {/* Bottom actions */}
      <View style={styles.bottom}>
        <Button
          full
          kind="primary"
          size="lg"
          onPress={handleNext}
          disabled={isLoading}
          accessibilityLabel={isLast ? t('auth.onboarding.getStarted') : t('auth.onboarding.next')}
        >
          {isLast ? t('auth.onboarding.getStarted') : t('auth.onboarding.next')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 60,
    paddingHorizontal: 28,
  },
  skipHit: {
    padding: 8,
  },
  skipText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.fg.tertiary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 60,
    maxWidth: SCREEN_W,
  },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 32,
    lineHeight: 32 * 1.2,
    letterSpacing: -0.5,
    color: colors.fg.primary,
    marginBottom: 20,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 16,
    lineHeight: 16 * 1.6,
    color: colors.fg.secondary,
    maxWidth: 320,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 24,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border.divider,
  },
  dotActive: {
    backgroundColor: colors.brand.primary,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
});
