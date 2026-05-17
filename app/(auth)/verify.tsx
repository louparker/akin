import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { TopBar } from '@/components/composed/TopBar';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';

  const [sent, setSent] = useState(false);

  async function handleResend() {
    if (!email) return;
    await supabase.auth.resend({ type: 'signup', email });
    setSent(true);
    // Reset "sent" state after 3 seconds
    setTimeout(() => {
      setSent(false);
    }, 3000);
  }

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
        <Text style={styles.body}>{t('auth.verify.body', { email: email || '…' })}</Text>
        <Text style={styles.spam}>{t('auth.verify.spam')}</Text>

        <Button
          kind="ghost"
          onPress={() => void handleResend()}
          accessibilityLabel={t('auth.verify.resend')}
          style={styles.resendBtn}
        >
          {sent ? t('auth.verify.resend.sent') : t('auth.verify.resend')}
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
  backButton: {
    padding: 8,
  },
  backArrow: {
    fontSize: 20,
    color: colors.fg.primary,
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 80,
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
});
