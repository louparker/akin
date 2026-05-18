import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { TopBar } from '@/components/composed/TopBar';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const RESEND_COOLDOWN_S = 60;
const POLL_INTERVAL_MS = 5_000;

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local[0]}***@${domain}`;
}

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  const masked = maskEmail(email);

  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFocused = useRef(true);

  function startCountdown() {
    setCountdown(RESEND_COOLDOWN_S);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
  }

  async function handleResend() {
    if (!email || countdown > 0) return;
    await supabase.auth.resend({ type: 'signup', email });
    startCountdown();
  }

  // Poll for email confirmation every 5s while screen is focused.
  useEffect(() => {
    isFocused.current = true;

    pollRef.current = setInterval(() => {
      if (!isFocused.current) return;
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user.email_confirmed_at) {
          if (pollRef.current) clearInterval(pollRef.current);
          router.replace('/(auth)/identifier');
        }
      });
    }, POLL_INTERVAL_MS);

    return () => {
      isFocused.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [router]);

  // Cleanup countdown on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const resendLabel =
    countdown > 0
      ? t('auth.verify.resend.countdown', { n: String(countdown) })
      : t('auth.verify.resend');

  return (
    <View style={styles.screen}>
      <TopBar
        bordered
        left={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={styles.backButton}
          >
            <Text style={styles.backArrow}>{'←'}</Text>
          </Pressable>
        }
      />

      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.verify.title')}</Text>

        <Text style={styles.body} testID="verify-body">
          {t('auth.verify.body', { email: masked || '…' })}
        </Text>

        <Text style={styles.spam}>{t('auth.verify.spam')}</Text>

        <Button
          kind="ghost"
          onPress={() => void handleResend()}
          disabled={countdown > 0}
          accessibilityLabel={t('auth.verify.resend')}
          accessibilityState={{ disabled: countdown > 0 }}
          style={styles.resendBtn}
        >
          {resendLabel}
        </Button>

        <View style={styles.secondaryLinks}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('auth.verify.wrongEmail')}
          >
            <Text style={styles.link}>{t('auth.verify.wrongEmail')}</Text>
          </Pressable>

          <Pressable
            onPress={() => void useAuthStore.getState().signOut()}
            accessibilityRole="button"
            accessibilityLabel={t('auth.verify.signOut')}
          >
            <Text style={styles.link}>{t('auth.verify.signOut')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  backButton: {
    padding: 8,
  },
  backArrow: {
    fontSize: 20,
    color: colors.fg.primary,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 60,
  },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.fg.primary,
    marginBottom: 16,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 16,
    lineHeight: 16 * 1.55,
    color: colors.fg.secondary,
    marginBottom: 12,
  },
  spam: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.fg.faint,
    marginBottom: 32,
  },
  resendBtn: {
    alignSelf: 'flex-start',
  },
  secondaryLinks: {
    marginTop: 36,
    gap: 20,
  },
  link: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.brand.primary,
    textDecorationLine: 'underline',
  },
});
