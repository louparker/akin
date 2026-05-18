import { View, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      {/* Top section */}
      <View style={styles.top}>
        <Text style={styles.wordmark}>Akin</Text>
        <Text style={styles.headline}>{t('auth.welcome.headline')}</Text>
        <Text style={styles.body}>{t('auth.welcome.body')}</Text>
      </View>

      {/* Bottom CTA section */}
      <View style={styles.bottom}>
        <Button
          full
          kind="primary"
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

        <View style={styles.tosRow}>
          <Text style={styles.tosText}>
            {t('auth.welcome.tos', {
              termsLink: t('auth.welcome.tos.terms'),
              privacyLink: t('auth.welcome.tos.privacy'),
            })}
          </Text>
          {/* Underlined term links rendered as separate pressable spans */}
          <View style={styles.tosLinks}>
            <Pressable accessibilityRole="link" accessibilityLabel={t('auth.welcome.tos.terms')}>
              <Text style={styles.tosLink}>{t('auth.welcome.tos.terms')}</Text>
            </Pressable>
            <Text style={styles.tosText}>{' · '}</Text>
            <Pressable accessibilityRole="link" accessibilityLabel={t('auth.welcome.tos.privacy')}>
              <Text style={styles.tosLink}>{t('auth.welcome.tos.privacy')}</Text>
            </Pressable>
          </View>
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
  tosRow: {
    alignItems: 'center',
    gap: 4,
  },
  tosText: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: colors.fg.faint,
    textAlign: 'center',
  },
  tosLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tosLink: {
    fontFamily: 'Inter',
    fontSize: 11.5,
    color: colors.fg.tertiary,
    textDecorationLine: 'underline',
  },
});
