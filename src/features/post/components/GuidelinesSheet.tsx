import { useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import { Button } from '@/components/primitives/Button';
import { legalConfig } from '@/lib/appConfig';

interface GuidelinesSheetProps {
  visible: boolean;
  onContinue: () => void;
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    // eslint-disable-next-line react-native/no-color-literals -- overlay alpha
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(35,31,33,0.55)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.bg.base,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 22,
      paddingTop: 12,
      paddingBottom: 40,
    },
    handle: {
      width: 36,
      height: 4,
      backgroundColor: c.border.divider,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    title: {
      fontFamily: 'Source Serif 4',
      fontSize: 24,
      letterSpacing: -0.3,
      color: c.fg.primary,
      marginBottom: 20,
    },
    rule: {
      marginBottom: 18,
    },
    ruleTitle: {
      fontFamily: 'Inter',
      fontSize: 15,
      fontWeight: '600',
      color: c.fg.primary,
      marginBottom: 4,
    },
    ruleBody: {
      fontFamily: 'Inter',
      fontSize: 14,
      lineHeight: 14 * 1.55,
      color: c.fg.secondary,
    },
    cta: {
      marginTop: 12,
      marginBottom: 16,
    },
    link: {
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.tertiary,
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
  });
}

export function GuidelinesSheet({ visible, onContinue }: GuidelinesSheetProps) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

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
            styles={styles}
            title={t('create.guidelines.rule1.title')}
            body={t('create.guidelines.rule1.body')}
          />
          <Rule
            styles={styles}
            title={t('create.guidelines.rule2.title')}
            body={t('create.guidelines.rule2.body')}
          />
          <Rule
            styles={styles}
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
              void Linking.openURL(legalConfig.guidelinesUrl);
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

function Rule({
  title,
  body,
  styles,
}: {
  title: string;
  body: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.rule}>
      <Text style={styles.ruleTitle}>{title}</Text>
      <Text style={styles.ruleBody}>{body}</Text>
    </View>
  );
}
