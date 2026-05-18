import { View, Text as RNText, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.wordmark}>Akin</Text>
        <Text style={styles.headline}>{t('auth.welcome.headline')}</Text>
        <Text style={styles.body}>{t('auth.welcome.body')}</Text>
      </View>

      <View style={styles.bottom}>
        <Button
          full
          kind="primary"
          size="lg"
          accessibilityLabel={t('auth.welcome.cta.signup')}
          onPress={() => router.push('/(auth)/signup')}
        >
          {t('auth.welcome.cta.signup')}
        </Button>

        <Button
          full
          kind="ghost"
          accessibilityLabel={t('auth.welcome.cta.login')}
          onPress={() => router.push('/(auth)/login')}
        >
          {t('auth.welcome.cta.login')}
        </Button>

        {/* Inline ToS — spaces are embedded in prefix/conjunction strings to avoid
            bare whitespace nodes, which react-native/no-raw-text flags. */}
        <RNText style={styles.tosText} textBreakStrategy="simple">
          {t('auth.welcome.tos.prefix')}
          <RNText
            style={styles.tosLink}
            accessibilityRole="link"
            accessibilityLabel={t('auth.welcome.tos.terms')}
            suppressHighlighting
          >
            {t('auth.welcome.tos.terms')}
          </RNText>
          {t('auth.welcome.tos.conjunction')}
          <RNText
            style={styles.tosLink}
            accessibilityRole="link"
            accessibilityLabel={t('auth.welcome.tos.privacy')}
            suppressHighlighting
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
    paddingBottom: 48,
    gap: 12,
  },
  tosText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.fg.faint,
    textAlign: 'center',
  },
  tosLink: {
    color: colors.fg.tertiary,
    textDecorationLine: 'underline',
  },
});
