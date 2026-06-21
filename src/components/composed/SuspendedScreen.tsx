import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { t } from '@/lib/i18n';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { useColorTokens } from '@/theme/useColorTokens';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const SUPPORT_EMAIL = 'hi@akin.app';

interface Props {
  suspendedUntil: string;
  locale?: 'sv' | 'en';
}

function formatAbsolute(until: string, locale: 'sv' | 'en'): string {
  try {
    return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(until));
  } catch {
    return '';
  }
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: c.bg.base,
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
      color: c.fg.primary,
    },
    body: {
      textAlign: 'center',
      marginBottom: 20,
      lineHeight: 22,
    },
    until: {
      fontFamily: 'JetBrains Mono',
      fontSize: 13,
      color: c.fg.tertiary,
      marginBottom: 32,
      textAlign: 'center',
    },
    contactBlock: {
      alignItems: 'center',
      gap: 4,
      marginBottom: 40,
    },
    contactLabel: {
      textAlign: 'center',
      color: c.fg.tertiary,
    },
    contactEmail: {
      fontFamily: 'JetBrains Mono',
      fontSize: 14,
      color: c.brand.primary,
      textDecorationLine: 'underline',
    },
    buttonWrapper: {
      width: '100%',
    },
  });
}

export default function SuspendedScreen({
  suspendedUntil,
  locale = 'en',
}: Props): React.JSX.Element {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);
  const absolute = formatAbsolute(suspendedUntil, locale);

  function handleBackToLogin() {
    void useAuthStore.getState().signOut();
  }

  function handleSupportPress() {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Suspended%20account`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container} testID="suspended-screen">
        <Text variant="title" style={styles.title}>
          {t('suspended.title')}
        </Text>
        <Text variant="bodyMuted" style={styles.body}>
          {t('suspended.body')}
        </Text>
        {absolute ? (
          <Text testID="suspended-until" style={styles.until}>
            {t('suspended.until', { date: absolute })}
          </Text>
        ) : null}
        <View style={styles.contactBlock}>
          <Text variant="bodyMuted" style={styles.contactLabel}>
            {t('suspended.contact')}
          </Text>
          <Pressable
            onPress={handleSupportPress}
            accessibilityRole="link"
            accessibilityLabel={`${t('suspended.contact')} ${SUPPORT_EMAIL}`}
            testID="suspended-support-email"
          >
            <Text style={styles.contactEmail}>{SUPPORT_EMAIL}</Text>
          </Pressable>
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            kind="secondary"
            size="lg"
            full
            onPress={handleBackToLogin}
            accessibilityLabel={t('suspended.backToLogin')}
            accessibilityRole="button"
          >
            {t('suspended.backToLogin')}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
