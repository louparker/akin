import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDistanceToNow } from 'date-fns';
import { sv, enUS } from 'date-fns/locale';

import { t } from '@/lib/i18n';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { colors } from '@/theme/colors';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

interface Props {
  suspendedUntil: string;
  locale?: 'sv' | 'en';
}

function formatCountdown(until: string, locale: 'sv' | 'en'): string {
  const dateFnsLocale = locale === 'sv' ? sv : enUS;
  try {
    return formatDistanceToNow(new Date(until), { locale: dateFnsLocale, addSuffix: false });
  } catch {
    return '';
  }
}

export default function SuspendedScreen({
  suspendedUntil,
  locale = 'en',
}: Props): React.JSX.Element {
  const [countdown, setCountdown] = useState(() => formatCountdown(suspendedUntil, locale));

  // Refresh countdown every 60 seconds (battery-friendly).
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(formatCountdown(suspendedUntil, locale));
    }, 60_000);
    return () => clearInterval(timer);
  }, [suspendedUntil, locale]);

  function handleLogOut() {
    void useAuthStore.getState().signOut();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container} testID="suspended-screen">
        <Text variant="title" style={styles.title}>
          {t('suspended.title')}
        </Text>
        <Text variant="bodyMuted" style={styles.body}>
          {t('suspended.body')}
        </Text>
        {countdown ? (
          <Text style={styles.countdown}>{t('suspended.countdown', { time: countdown })}</Text>
        ) : null}
        <View style={styles.buttonWrapper}>
          <Button
            kind="secondary"
            size="lg"
            full
            onPress={handleLogOut}
            accessibilityLabel={t('suspended.logout')}
            accessibilityRole="button"
          >
            {t('suspended.logout')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    color: colors.fg.primary,
  },
  body: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  countdown: {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    color: colors.fg.tertiary,
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonWrapper: {
    width: '100%',
  },
});
