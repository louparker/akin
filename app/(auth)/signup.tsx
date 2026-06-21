// CRITICAL-PATH: auth — pending expert review

import { useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Keyboard } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getLocales } from 'expo-localization';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { Input } from '@/components/primitives/Input';
import { TopBar } from '@/components/composed/TopBar';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { signupSchema, type SignupFormValues } from '@/features/auth/schemas/signup';

function deviceLanguage(): 'sv' | 'en' {
  const tag = getLocales()[0]?.languageTag ?? 'en';
  return tag.startsWith('sv') ? 'sv' : 'en';
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
    scrollContent: {
      paddingTop: 20,
      paddingBottom: 40,
      paddingHorizontal: 28,
    },
    title: {
      fontFamily: 'Source Serif 4',
      fontSize: 36,
      lineHeight: 36 * 1.15,
      letterSpacing: -0.5,
      color: c.fg.primary,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Inter',
      fontSize: 14,
      lineHeight: 14 * 1.5,
      color: c.fg.secondary,
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
    ageCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      marginTop: 28,
      padding: 16,
      paddingHorizontal: 18,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.divider,
      borderRadius: 4,
      backgroundColor: c.bg.raised,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderWidth: 1.5,
      borderColor: c.fg.tertiary,
      borderRadius: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    checkboxChecked: {
      backgroundColor: c.brand.primary,
      borderColor: c.brand.primary,
    },
    checkmark: {
      color: c.fg.inverse,
      fontSize: 11,
      fontWeight: '700',
    },
    ageTextCol: {
      flex: 1,
      gap: 4,
    },
    ageLabel: {
      fontFamily: 'Inter Medium',
      fontWeight: '500',
      fontSize: 14,
      color: c.fg.primary,
    },
    ageDesc: {
      fontFamily: 'Inter',
      fontSize: 12.5,
      color: c.fg.secondary,
      lineHeight: 12.5 * 1.45,
    },
    cta: {
      marginTop: 32,
    },
  });
}

export default function SignupScreen() {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      ageConfirmed: undefined as unknown as true,
    },
  });

  async function onSubmit(values: SignupFormValues) {
    await useAuthStore.getState().signUp(values.email.trim(), values.password, deviceLanguage());
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

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text testID="signup-title" style={styles.title}>
          {t('auth.signup.title')}
        </Text>
        <Text style={styles.subtitle}>{t('auth.signup.subtitle')}</Text>

        <View style={styles.fields}>
          {/* Email */}
          <View>
            <Controller
              control={control}
              name="email"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label={t('auth.signup.email.label')}
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    useAuthStore.getState().clearError();
                  }}
                  onBlur={onBlur}
                  placeholder={t('auth.signup.email.placeholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  accessibilityLabel={t('auth.signup.email.label')}
                  testID="signup-email"
                />
              )}
            />
            {errors.email ? (
              <Text style={styles.fieldError} accessibilityRole="alert">
                {t('auth.signup.error.generic')}
              </Text>
            ) : null}
          </View>

          {/* Password */}
          <View>
            <Controller
              control={control}
              name="password"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label={t('auth.signup.password.label')}
                  value={value}
                  onChangeText={(text) => {
                    onChange(text);
                    useAuthStore.getState().clearError();
                  }}
                  onBlur={onBlur}
                  placeholder={t('auth.signup.password.placeholder')}
                  hint={t('auth.signup.password.hint')}
                  secureTextEntry
                  textContentType="none"
                  accessibilityLabel={t('auth.signup.password.label')}
                  testID="signup-password"
                />
              )}
            />
            {errors.password ? (
              <Text style={styles.fieldError} accessibilityRole="alert">
                {t('auth.signup.error.weak_password')}
              </Text>
            ) : null}
          </View>

          {/* Confirm password */}
          <View>
            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  label={t('auth.signup.confirmPassword.label')}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder={t('auth.signup.confirmPassword.placeholder')}
                  secureTextEntry
                  textContentType="none"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                  accessibilityLabel={t('auth.signup.confirmPassword.label')}
                  testID="signup-confirm-password"
                />
              )}
            />
            {errors.confirmPassword ? (
              <Text style={styles.fieldError} accessibilityRole="alert">
                {t('auth.signup.error.password_mismatch')}
              </Text>
            ) : null}
          </View>
        </View>

        {/* 18+ checkbox card */}
        <Controller
          control={control}
          name="ageConfirmed"
          render={({ field: { value, onChange } }) => (
            <Pressable
              style={styles.ageCard}
              onPress={() => onChange(value ? undefined : true)}
              accessibilityRole="checkbox"
              accessibilityLabel={t('auth.signup.age.label')}
              accessibilityState={{ checked: value === true }}
            >
              <View style={[styles.checkbox, value === true && styles.checkboxChecked]}>
                {value === true ? <Text style={styles.checkmark}>{'✓'}</Text> : null}
              </View>
              <View style={styles.ageTextCol}>
                <Text style={styles.ageLabel}>{t('auth.signup.age.label')}</Text>
                <Text style={styles.ageDesc}>{t('auth.signup.age.description')}</Text>
              </View>
            </Pressable>
          )}
        />
        {errors.ageConfirmed ? (
          <Text style={styles.fieldError} accessibilityRole="alert">
            {t('auth.signup.error.age_required')}
          </Text>
        ) : null}

        {storeError ? (
          <Text style={styles.fieldError} accessibilityRole="alert">
            {storeError}
          </Text>
        ) : null}

        <Button
          full
          kind="primary"
          size="lg"
          loading={isLoading}
          onPress={() => void handleSubmit(onSubmit)()}
          disabled={isLoading}
          accessibilityLabel={t('auth.signup.cta')}
          style={styles.cta}
        >
          {t('auth.signup.cta')}
        </Button>
      </ScrollView>
    </View>
  );
}
