import { Modal, View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { Button } from '@/components/primitives/Button';

const GUIDELINES_URL = 'https://akin.app/guidelines';

interface GuidelinesSheetProps {
  visible: boolean;
  onContinue: () => void;
}

export function GuidelinesSheet({ visible, onContinue }: GuidelinesSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onContinue}
      accessibilityViewIsModal
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} accessibilityRole="none" />
          <Text style={styles.title}>{t('create.guidelines.title')}</Text>

          <Rule
            title={t('create.guidelines.rule1.title')}
            body={t('create.guidelines.rule1.body')}
          />
          <Rule
            title={t('create.guidelines.rule2.title')}
            body={t('create.guidelines.rule2.body')}
          />
          <Rule
            title={t('create.guidelines.rule3.title')}
            body={t('create.guidelines.rule3.body')}
          />

          <View style={styles.cta}>
            <Button kind="primary" size="lg" full onPress={onContinue}>
              {t('create.guidelines.cta')}
            </Button>
          </View>

          <Pressable
            onPress={() => {
              void Linking.openURL(GUIDELINES_URL);
            }}
            accessibilityRole="link"
            accessibilityLabel={t('create.guidelines.link')}
          >
            <Text style={styles.link}>{t('create.guidelines.link')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.rule}>
      <Text style={styles.ruleTitle}>{title}</Text>
      <Text style={styles.ruleBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // eslint-disable-next-line react-native/no-color-literals -- overlay alpha
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(35,31,33,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.base,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 24,
    letterSpacing: -0.3,
    color: colors.fg.primary,
    marginBottom: 20,
  },
  rule: {
    marginBottom: 18,
  },
  ruleTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    color: colors.fg.primary,
    marginBottom: 4,
  },
  ruleBody: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 14 * 1.55,
    color: colors.fg.secondary,
  },
  cta: {
    marginTop: 12,
    marginBottom: 16,
  },
  link: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.fg.tertiary,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
