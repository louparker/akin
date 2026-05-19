import { View, Pressable, Text as RNText, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/primitives/Text';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.wordmark}>Akin</Text>
        <Text style={styles.headline}>{t('auth.welcome.headline')}</Text>
        <Text style={styles.body}>{t('auth.welcome.body')}</Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.welcome.cta.signup')}
          onPress={() => router.push('/(auth)/signup')}
          style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
        >
          <RNText style={[styles.btnText, styles.btnTextPrimary]}>
            {t('auth.welcome.cta.signup')}
          </RNText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.welcome.cta.login')}
          onPress={() => router.push('/(auth)/login')}
          style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.btnPressed]}
        >
          <RNText style={[styles.btnText, styles.btnTextGhost]}>
            {t('auth.welcome.cta.login')}
          </RNText>
        </Pressable>

        {/* Inline ToS — spaces are embedded in prefix/conjunction strings to avoid
            bare whitespace nodes, which react-native/no-raw-text flags. */}
        <RNText style={styles.tosText} textBreakStrategy="simple">
          {t('auth.welcome.tos.prefix')}
          <RNText
            style={styles.tosLink}
            accessibilityRole="link"
            accessibilityLabel={t('auth.welcome.tos.terms')}
            suppressHighlighting
            onPress={() => void Linking.openURL('https://akin.app/terms')}
          >
            {t('auth.welcome.tos.terms')}
          </RNText>
          {t('auth.welcome.tos.conjunction')}
          <RNText
            style={styles.tosLink}
            accessibilityRole="link"
            accessibilityLabel={t('auth.welcome.tos.privacy')}
            suppressHighlighting
            onPress={() => void Linking.openURL('https://akin.app/privacy')}
          >
            {t('auth.welcome.tos.privacy')}
          </RNText>
          {t('auth.welcome.tos.suffix')}
        </RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  top: {
    flex: 1,
    paddingTop: 120,
    paddingHorizontal: 32,
  },
  wordmark: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.fg.faint,
    marginBottom: 28,
  },
  headline: {
    fontFamily: 'Source Serif 4',
    fontSize: 44,
    lineHeight: 44 * 1.05,
    letterSpacing: -0.8,
    color: colors.fg.primary,
    marginBottom: 20,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 16,
    lineHeight: 16 * 1.55,
    color: colors.fg.secondary,
    maxWidth: 290,
  },
  bottom: {
    paddingHorizontal: 24,
  },
  btn: {
    height: 54,
    borderRadius: 4,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  btnPrimary: {
    backgroundColor: colors.bg.inverse,
  },
  btnGhost: {
    height: 48,
  },
  btnPressed: {
    opacity: 0.8,
  },
  btnText: {
    fontFamily: 'Inter Medium',
    fontWeight: '500',
    fontSize: 16,
    letterSpacing: -0.1,
  },
  btnTextPrimary: {
    color: colors.fg.inverse,
  },
  btnTextGhost: {
    color: colors.fg.secondary,
    fontSize: 15,
  },
  tosText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.fg.faint,
    textAlign: 'center',
    marginTop: 8,
  },
  tosLink: {
    color: colors.fg.tertiary,
    textDecorationLine: 'underline',
  },
});
