import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { TopBar } from '@/components/composed/TopBar';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

export default function LoginScreen() {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);
  // eslint-disable-next-line @typescript-eslint/unbound-method -- Zustand actions are closures, not this-bound methods
  const { signIn, clearError } = useAuthStore.getState();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleEmailChange(text: string) {
    setEmail(text);
    clearError();
  }

  function handlePasswordChange(text: string) {
    setPassword(text);
    clearError();
  }

  async function handleSubmit() {
    await signIn(email.trim(), password);
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
        <Text style={styles.title}>{t('auth.login.title')}</Text>

        <View style={styles.fields}>
          <Input
            label={t('auth.login.email.label')}
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            accessibilityLabel={t('auth.login.email.label')}
          />
          <Input
            label={t('auth.login.password.label')}
            value={password}
            onChangeText={handlePasswordChange}
            secureTextEntry
            accessibilityLabel={t('auth.login.password.label')}
          />
        </View>

        <View style={styles.forgotRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('auth.login.forgot')}>
            <Text style={styles.forgotText}>{t('auth.login.forgot')}</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          full
          kind="primary"
          onPress={() => void handleSubmit()}
          disabled={isLoading}
          accessibilityLabel={t('auth.login.cta')}
          style={styles.cta}
        >
          {t('auth.login.cta')}
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
    paddingTop: 60,
    paddingHorizontal: 28,
  },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 30,
    letterSpacing: -0.5,
    color: colors.fg.primary,
    marginBottom: 32,
  },
  fields: {
    gap: 20,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  forgotText: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.brand.primary,
    textDecorationLine: 'underline',
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.semantic.danger,
    marginTop: 12,
  },
  cta: {
    marginTop: 28,
  },
});
