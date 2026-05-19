import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { TopBar } from '@/components/composed/TopBar';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordScreen() {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: FormValues) {
    await useAuthStore.getState().requestPasswordReset(values.email.trim());
    setSent(true);
  }

  if (sent) {
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
          <Text style={styles.title}>{t('auth.reset.sent.title')}</Text>
          <Text style={styles.subtitle}>{t('auth.reset.sent.body')}</Text>
        </View>
      </View>
    );
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
        <Text style={styles.title}>{t('auth.reset.title')}</Text>
        <Text style={styles.subtitle}>{t('auth.reset.subtitle')}</Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { value, onChange, onBlur } }) => (
            <Input
              label={t('auth.reset.email.label')}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel={t('auth.reset.email.label')}
            />
          )}
        />
        {errors.email ? (
          <Text style={styles.fieldError} accessibilityRole="alert">
            {t('auth.signup.error.generic')}
          </Text>
        ) : null}

        <Button
          full
          kind="primary"
          size="lg"
          loading={isLoading}
          onPress={() => void handleSubmit(onSubmit)()}
          disabled={isLoading}
          accessibilityLabel={t('auth.reset.cta')}
          style={styles.cta}
        >
          {t('auth.reset.cta')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  backButton: { padding: 8 },
  backArrow: { fontSize: 20, color: colors.fg.primary },
  content: { paddingTop: 48, paddingHorizontal: 28 },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 36,
    lineHeight: 36 * 1.15,
    letterSpacing: -0.5,
    color: colors.fg.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 14 * 1.5,
    color: colors.fg.secondary,
    marginBottom: 32,
  },
  fieldError: { fontFamily: 'Inter', fontSize: 12, color: colors.semantic.danger, marginTop: 4 },
  cta: { marginTop: 28 },
});
