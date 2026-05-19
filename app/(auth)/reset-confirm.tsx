// Deep-linked from the password-reset email.
// URL scheme: akin://reset-confirm — Expo Router handles the path match.
// CRITICAL-PATH: auth — pending expert review

import { View, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetConfirmScreen() {
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: FormValues) {
    await useAuthStore.getState().updatePassword(values.password);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>{t('auth.resetConfirm.title')}</Text>

        <View style={styles.fields}>
          <View>
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label={t('auth.resetConfirm.password.label')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  hint={t('auth.signup.password.hint')}
                  accessibilityLabel={t('auth.resetConfirm.password.label')}
                />
              )}
            />
            {errors.password ? (
              <Text style={styles.fieldError} accessibilityRole="alert">
                {t('auth.resetConfirm.error.weak')}
              </Text>
            ) : null}
          </View>

          <View>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label={t('auth.resetConfirm.confirm.label')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry
                  accessibilityLabel={t('auth.resetConfirm.confirm.label')}
                />
              )}
            />
            {errors.confirmPassword ? (
              <Text style={styles.fieldError} accessibilityRole="alert">
                {t('auth.resetConfirm.error.mismatch')}
              </Text>
            ) : null}
          </View>
        </View>

        {storeError ? (
          <Text style={styles.fieldError} accessibilityRole="alert">
            {t('auth.resetConfirm.error.generic')}
          </Text>
        ) : null}

        <Button
          full
          kind="primary"
          size="lg"
          loading={isLoading}
          onPress={() => void handleSubmit(onSubmit)()}
          disabled={isLoading}
          accessibilityLabel={t('auth.resetConfirm.cta')}
          style={styles.cta}
        >
          {t('auth.resetConfirm.cta')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  content: { paddingTop: 100, paddingHorizontal: 28 },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 36,
    lineHeight: 36 * 1.15,
    letterSpacing: -0.5,
    color: colors.fg.primary,
    marginBottom: 32,
  },
  fields: { gap: 20 },
  fieldError: { fontFamily: 'Inter', fontSize: 12, color: colors.semantic.danger, marginTop: 4 },
  cta: { marginTop: 28 },
});
