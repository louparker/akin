// CRITICAL-PATH: auth — pending expert review

import { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { TopBar } from '@/components/composed/TopBar';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function mapLoginError(raw: string | null): string | null {
  if (!raw) return null;
  if (/rate.limit|too many/i.test(raw)) return t('auth.login.error.rateLimit', { n: '10' });
  if (/invalid|credentials|password|email/i.test(raw)) return t('auth.login.error.invalid');
  return t('auth.login.error.generic');
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg.base,
    },
    backButton: {
      padding: 8,
    },
    backArrow: {
      fontSize: 20,
      color: c.fg.primary,
    },
    content: {
      paddingTop: 32,
      paddingBottom: 40,
      paddingHorizontal: 28,
    },
    title: {
      fontFamily: 'Source Serif 4',
      fontSize: 36,
      lineHeight: 36 * 1.15,
      letterSpacing: -0.5,
      color: c.fg.primary,
      marginBottom: 32,
    },
    fields: {
      gap: 20,
    },
    fieldError: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: c.semantic.danger,
      marginTop: 4,
    },
    forgotRow: {
      alignItems: 'flex-end',
      marginTop: 12,
    },
    forgotText: {
      fontFamily: 'Inter',
      fontSize: 13,
      color: c.brand.primary,
      textDecorationLine: 'underline',
    },
    errorText: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: c.semantic.danger,
      marginTop: 12,
    },
    cta: {
      marginTop: 28,
    },
    signupRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    signupText: {
      fontFamily: 'Inter',
      fontSize: 13,
      color: c.fg.tertiary,
    },
    signupLink: {
      fontFamily: 'Inter',
      fontSize: 13,
      color: c.brand.primary,
      textDecorationLine: 'underline',
    },
  });
}

export default function LoginScreen() {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const rawError = useAuthStore((s) => s.error);
  const displayError = mapLoginError(rawError);
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginFormValues) {
    await useAuthStore.getState().signIn(values.email.trim(), values.password);
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

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('auth.login.title')}</Text>

        <View style={styles.fields}>
          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label={t('auth.login.email.label')}
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  useAuthStore.getState().clearError();
                }}
                onBlur={onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                accessibilityLabel={t('auth.login.email.label')}
                testID="login-email"
              />
            )}
          />
          {errors.email ? (
            <Text style={styles.fieldError} accessibilityRole="alert">
              {t('auth.login.error.invalid')}
            </Text>
          ) : null}

          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                label={t('auth.login.password.label')}
                value={value}
                onChangeText={(text) => {
                  onChange(text);
                  useAuthStore.getState().clearError();
                }}
                onBlur={onBlur}
                secureTextEntry
                accessibilityLabel={t('auth.login.password.label')}
                testID="login-password"
              />
            )}
          />
        </View>

        {/* Forgot password — right-aligned */}
        <View style={styles.forgotRow}>
          <Pressable
            onPress={() => router.push('/(auth)/reset-password')}
            accessibilityRole="link"
            accessibilityLabel={t('auth.login.forgot')}
          >
            <Text style={styles.forgotText}>{t('auth.login.forgot')}</Text>
          </Pressable>
        </View>

        {displayError ? (
          <Text style={styles.errorText} accessibilityRole="alert">
            {displayError}
          </Text>
        ) : null}

        <Button
          full
          kind="primary"
          size="lg"
          loading={isLoading}
          onPress={() => void handleSubmit(onSubmit)()}
          disabled={isLoading}
          accessibilityLabel={t('auth.login.cta')}
          style={styles.cta}
        >
          {t('auth.login.cta')}
        </Button>

        {/* Signup link */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>{t('auth.login.signup')} </Text>
          <Pressable
            onPress={() => router.push('/(auth)/signup')}
            accessibilityRole="link"
            accessibilityLabel={t('auth.welcome.cta.signup')}
          >
            <Text style={styles.signupLink}>{t('auth.welcome.cta.signup')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
