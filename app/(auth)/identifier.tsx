import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/primitives/Text';
import { Button } from '@/components/primitives/Button';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { useAuthStore } from '@/features/auth/store/useAuthStore';

// Example identifiers shown below the divider.
const EXAMPLE_IDENTIFIERS = ['VioletMoth88', 'SilverBirch14', 'CloudyPeak31'];

function IdentifierDisplay({ identifier }: { identifier: string }) {
  // Split the identifier into word part and trailing number suffix
  const match = /^([A-Za-z]+)(\d+)$/.exec(identifier);
  if (!match) {
    return <Text style={styles.identifier}>{identifier}</Text>;
  }
  const [, word, number] = match;
  return (
    <Text style={styles.identifier}>
      <Text style={styles.identifierWord}>{word}</Text>
      <Text style={styles.identifierNumber}>{number}</Text>
    </Text>
  );
}

export default function IdentifierScreen() {
  const profile = useAuthStore((s) => s.profile);
  const isLoading = useAuthStore((s) => s.isLoading);
  // eslint-disable-next-line @typescript-eslint/unbound-method -- Zustand actions are closures, not this-bound methods
  const { generateIdentifier, confirmIdentifier } = useAuthStore.getState();

  const identifier = profile?.anonymous_identifier ?? '…';

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>{t('auth.identifier.eyebrow')}</Text>

        <IdentifierDisplay identifier={identifier} />

        <Text style={styles.body}>{t('auth.identifier.body')}</Text>

        <View style={styles.divider} />

        <Text style={styles.examplesLabel}>{t('auth.identifier.examples.label')}</Text>
        {EXAMPLE_IDENTIFIERS.map((ex) => (
          <Text key={ex} style={styles.exampleItem}>
            {ex}
          </Text>
        ))}
      </View>

      <View style={styles.bottom}>
        <Button
          full
          kind="primary"
          onPress={() => void confirmIdentifier()}
          disabled={isLoading}
          accessibilityLabel={t('auth.identifier.cta.confirm')}
        >
          {t('auth.identifier.cta.confirm')}
        </Button>
        <Button
          full
          kind="ghost"
          onPress={() => void generateIdentifier()}
          disabled={isLoading}
          accessibilityLabel={t('auth.identifier.cta.retry')}
        >
          {t('auth.identifier.cta.retry')}
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
  content: {
    flex: 1,
    paddingTop: 100,
    paddingHorizontal: 32,
  },
  eyebrow: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.fg.faint,
    marginBottom: 24,
  },
  identifier: {
    fontFamily: 'Source Serif 4',
    fontSize: 52,
    lineHeight: 52 * 1.05,
    letterSpacing: -1,
    color: colors.fg.primary,
    marginBottom: 24,
  },
  identifierWord: {
    color: colors.fg.primary,
  },
  identifierNumber: {
    color: colors.brand.primary,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 15 * 1.55,
    color: colors.fg.secondary,
    marginBottom: 36,
    maxWidth: 310,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.divider,
    marginBottom: 16,
  },
  examplesLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.fg.secondary,
    marginBottom: 8,
  },
  exampleItem: {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    color: colors.fg.secondary,
    lineHeight: 13 * 1.6,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 12,
  },
});
