import { useMemo } from 'react';
import { View, Pressable, Text as RNText, StyleSheet, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/primitives/Text';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg.base,
    },
    top: {
      flex: 1,
      paddingTop: 100,
      paddingHorizontal: 32,
    },
    wordmark: {
      fontFamily: 'JetBrains Mono',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: c.fg.faint,
      marginBottom: 28,
    },
    headline: {
      fontFamily: 'Source Serif 4',
      fontSize: 44,
      lineHeight: 44 * 1.05,
      letterSpacing: -0.8,
      color: c.fg.primary,
      marginBottom: 20,
    },
    body: {
      fontFamily: 'Inter',
      fontSize: 16,
      lineHeight: 16 * 1.55,
      color: c.fg.secondary,
      maxWidth: 290,
    },
    bottom: {
      paddingHorizontal: 24,
    },
    btnPrimary: {
      width: '100%',
      height: 54,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.bg.inverse,
      marginBottom: 12,
    },
    btnGhost: {
      width: '100%',
      height: 48,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    btnTextPrimary: {
      fontFamily: 'Inter Medium',
      fontWeight: '500',
      fontSize: 16,
      letterSpacing: -0.1,
      color: c.fg.inverse,
    },
    btnTextGhost: {
      fontFamily: 'Inter Medium',
      fontWeight: '500',
      fontSize: 15,
      letterSpacing: -0.1,
      color: c.fg.secondary,
    },
    tosText: {
      fontFamily: 'Inter',
      fontSize: 11.5,
      lineHeight: 16,
      color: c.fg.faint,
      textAlign: 'center',
      marginTop: 12,
    },
    tosLink: {
      color: c.fg.tertiary,
      textDecorationLine: 'underline',
    },
  });
}

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

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
          style={styles.btnPrimary}
        >
          <RNText style={styles.btnTextPrimary}>{t('auth.welcome.cta.signup')}</RNText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('auth.welcome.cta.login')}
          onPress={() => router.push('/(auth)/login')}
          style={styles.btnGhost}
        >
          <RNText style={styles.btnTextGhost}>{t('auth.welcome.cta.login')}</RNText>
        </Pressable>

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
