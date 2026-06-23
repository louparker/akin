// Deep-linked from the signup confirmation email.
// URL scheme: akin://confirm?token_hash=<hash>&type=signup — Expo Router matches
// the path; the single-use token_hash is verified via verifyOtp on mount.
// CRITICAL-PATH: auth — pending expert review

import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import type { EmailOtpType } from '@supabase/supabase-js';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const KNOWN_TYPES = ['signup', 'recovery', 'email_change', 'email', 'magiclink'] as const;

function asOtpType(raw: string | undefined): EmailOtpType {
  return KNOWN_TYPES.find((tt) => tt === raw) ?? 'signup';
}

export default function ConfirmScreen() {
  const params = useLocalSearchParams<{ token_hash?: string; type?: string }>();
  const [failed, setFailed] = useState(false);
  // Guard against double-invocation (Strict Mode / re-render): the token_hash is
  // single-use, so a second verifyOtp would always fail and flip the UI to error.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const tokenHash = params.token_hash;
    if (!tokenHash) {
      setFailed(true);
      return;
    }

    void useAuthStore
      .getState()
      .confirmFromDeepLink(tokenHash, asOtpType(params.type))
      .then((ok) => {
        if (!ok) setFailed(true);
      });
  }, [params.token_hash, params.type]);

  if (failed) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('auth.confirm.error.title')}</Text>
          <Text style={styles.body}>{t('auth.confirm.error.body')}</Text>
          <Button
            kind="primary"
            size="lg"
            full
            onPress={() => router.replace('/(auth)')}
            accessibilityLabel={t('auth.confirm.error.cta')}
            style={styles.cta}
          >
            {t('auth.confirm.error.cta')}
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <ActivityIndicator color={colors.fg.tertiary} />
        <Text style={styles.title}>{t('auth.confirm.title')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 16,
  },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 28,
    color: colors.fg.primary,
    textAlign: 'center',
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 15 * 1.5,
    color: colors.fg.secondary,
    textAlign: 'center',
  },
  cta: { marginTop: 12, alignSelf: 'stretch' },
});
