// CRITICAL-PATH: auth privacy — pending expert review
// Multi-step account deletion: warning → phrase confirm → password re-entry.

import { useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

type Step = 1 | 2 | 3;

export default function DeleteAccountScreen() {
  const router = useRouter();
  const isLoading = useAuthStore((s) => s.isLoading);
  const storeError = useAuthStore((s) => s.error);

  const [step, setStep] = useState<Step>(1);
  const [phrase, setPhrase] = useState('');
  const [phraseError, setPhraseError] = useState(false);
  const [password, setPassword] = useState('');

  const CONFIRM_PHRASE = t('auth.delete.step2.phrase');

  function handleStep1Continue() {
    setStep(2);
  }

  function handleStep2Continue() {
    if (phrase.trim().toLowerCase() !== CONFIRM_PHRASE.toLowerCase()) {
      setPhraseError(true);
      return;
    }
    setPhraseError(false);
    setStep(3);
  }

  async function handleFinalDelete() {
    await useAuthStore.getState().deleteAccount(password);
  }

  return (
    <View style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => (step === 1 ? router.back() : setStep((s) => (s - 1) as Step))}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={styles.backHit}
        >
          <Text style={styles.backArrow}>{'←'}</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>{t('auth.delete.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {step === 1 ? (
          <>
            <Text style={styles.sectionTitle}>{t('auth.delete.step1.title')}</Text>
            <Text style={styles.body}>{t('auth.delete.step1.body')}</Text>
            <View style={styles.actions}>
              <Button
                full
                kind="danger"
                onPress={handleStep1Continue}
                accessibilityLabel={t('auth.signup.cta')}
              >
                {t('auth.signup.cta')}
              </Button>
              <Button
                full
                kind="ghost"
                onPress={() => router.back()}
                accessibilityLabel={t('auth.delete.cancel')}
              >
                {t('auth.delete.cancel')}
              </Button>
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.sectionTitle}>{t('auth.delete.step2.label')}</Text>
            <TextInput
              style={styles.phraseInput}
              value={phrase}
              onChangeText={(text) => {
                setPhrase(text);
                setPhraseError(false);
              }}
              placeholder={t('auth.delete.step2.placeholder')}
              placeholderTextColor={colors.fg.faint}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={t('auth.delete.step2.label')}
            />
            {phraseError ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {t('auth.delete.step2.error')}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <Button
                full
                kind="danger"
                onPress={handleStep2Continue}
                accessibilityLabel={t('auth.delete.cta')}
              >
                {t('auth.delete.cta')}
              </Button>
              <Button
                full
                kind="ghost"
                onPress={() => router.back()}
                accessibilityLabel={t('auth.delete.cancel')}
              >
                {t('auth.delete.cancel')}
              </Button>
            </View>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Text style={styles.sectionTitle}>{t('auth.delete.step3.label')}</Text>
            <TextInput
              style={styles.phraseInput}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.fg.faint}
              secureTextEntry
              accessibilityLabel={t('auth.delete.step3.label')}
            />
            {storeError ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {t('auth.delete.step3.error')}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <Button
                full
                kind="danger"
                onPress={() => void handleFinalDelete()}
                disabled={isLoading || !password}
                accessibilityLabel={t('auth.delete.cta')}
              >
                {t('auth.delete.cta')}
              </Button>
              <Button
                full
                kind="ghost"
                onPress={() => router.back()}
                accessibilityLabel={t('auth.delete.cancel')}
              >
                {t('auth.delete.cancel')}
              </Button>
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  backHit: { padding: 8 },
  backArrow: { fontSize: 20, color: colors.fg.primary },
  topBarTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '500',
    color: colors.fg.primary,
    marginLeft: 8,
  },
  scrollContent: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 48 },
  sectionTitle: {
    fontFamily: 'Source Serif 4',
    fontSize: 24,
    letterSpacing: -0.3,
    color: colors.fg.primary,
    marginBottom: 16,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 15 * 1.6,
    color: colors.fg.secondary,
    marginBottom: 32,
  },
  phraseInput: {
    backgroundColor: colors.bg.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.divider,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.fg.primary,
    marginBottom: 8,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.semantic.danger,
    marginBottom: 16,
  },
  actions: { marginTop: 24, gap: 12 },
});
