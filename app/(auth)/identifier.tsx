import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Skeleton } from '@/components/composed/Skeleton';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const EXAMPLE_IDENTIFIERS = ['VioletMoth88', 'SilverBirch14', 'CloudyPeak31'];
const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 10_000;

function isPending(id: string | null | undefined): boolean {
  return !id || id.startsWith('pending_');
}

function IdentifierDisplay({ identifier }: { identifier: string }) {
  const match = /^([A-Za-z]+)(\d+)$/.exec(identifier);
  if (!match) {
    return <Text style={styles.identifier}>{identifier}</Text>;
  }
  const [, word, number] = match;
  return (
    <Text style={styles.identifier}>
      <Text style={styles.identifierWord}>{word}</Text>
      <Text style={styles.identifierNumber}>{number}</Text>
    </Text>
  );
}

export default function IdentifierScreen() {
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);

  const identifier = profile?.anonymous_identifier ?? null;
  const [timedOut, setTimedOut] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Poll for identifier to resolve from pending state.
  useEffect(() => {
    if (!isPending(identifier)) return;

    // Start 10-second timeout
    timeoutRef.current = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setTimedOut(true);
    }, POLL_TIMEOUT_MS);

    // Poll by refreshing profile
    pollRef.current = setInterval(() => {
      void useAuthStore.getState().generateIdentifier();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [identifier]);

  // Stop polling as soon as the identifier resolves.
  useEffect(() => {
    if (!isPending(identifier) && pollRef.current) {
      clearInterval(pollRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setTimedOut(false);
    }
  }, [identifier]);

  const showLoading = (isPending(identifier) || isLoading) && !timedOut;
  const showError = timedOut && isPending(identifier);
  const showContent = !showLoading && !showError && identifier;

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {showLoading ? (
          <View testID="identifier-loading">
            <Text style={styles.eyebrow}>{t('auth.identifier.loading')}</Text>
            <Skeleton width={240} height={60} style={styles.identifierSkeleton} />
          </View>
        ) : null}

        {showError ? (
          <View testID="identifier-error">
            <Text style={styles.eyebrow}>{t('auth.identifier.error')}</Text>
            <Button
              kind="secondary"
              onPress={() => {
                setTimedOut(false);
                void useAuthStore.getState().generateIdentifier();
              }}
              accessibilityLabel={t('common.retry')}
            >
              {t('common.retry')}
            </Button>
          </View>
        ) : null}

        {showContent ? (
          <>
            <Text style={styles.eyebrow}>{t('auth.identifier.eyebrow')}</Text>
            <IdentifierDisplay identifier={identifier} />
            <Text style={styles.body}>{t('auth.identifier.body')}</Text>
            <View style={styles.divider} />
            <Text style={styles.examplesLabel}>{t('auth.identifier.examples.label')}</Text>
            {EXAMPLE_IDENTIFIERS.map((ex) => (
              <Text key={ex} style={styles.exampleItem}>
                {ex}
              </Text>
            ))}
          </>
        ) : null}
      </View>

      {showContent ? (
        <View style={styles.bottom}>
          <Button
            full
            kind="primary"
            size="lg"
            loading={isLoading}
            onPress={() => void useAuthStore.getState().confirmIdentifier()}
            disabled={isLoading}
            accessibilityLabel={t('auth.identifier.cta.confirm')}
          >
            {t('auth.identifier.cta.confirm')}
          </Button>
          <Button
            full
            kind="ghost"
            onPress={() => void useAuthStore.getState().generateIdentifier()}
            disabled={isLoading}
            accessibilityLabel={t('auth.identifier.cta.retry')}
          >
            {t('auth.identifier.cta.retry')}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  content: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  eyebrow: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.fg.faint,
    marginBottom: 24,
  },
  identifierSkeleton: {
    height: 60,
    width: 240,
    borderRadius: 4,
    marginBottom: 24,
  },
  identifier: {
    fontFamily: 'Source Serif 4',
    fontSize: 52,
    lineHeight: 52 * 1.05,
    letterSpacing: -1,
    color: colors.fg.primary,
    marginBottom: 24,
  },
  identifierWord: {
    color: colors.fg.primary,
  },
  identifierNumber: {
    color: colors.brand.primary,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 15 * 1.55,
    color: colors.fg.secondary,
    marginBottom: 36,
    maxWidth: 310,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.divider,
    marginBottom: 16,
  },
  examplesLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.fg.secondary,
    marginBottom: 8,
  },
  exampleItem: {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    color: colors.fg.secondary,
    lineHeight: 13 * 1.6,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 12,
  },
});
