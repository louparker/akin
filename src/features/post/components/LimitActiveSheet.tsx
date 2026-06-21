import { useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';

interface LimitActiveSheetProps {
  visible: boolean;
  activeCount: number;
  onClose: () => void;
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    // eslint-disable-next-line react-native/no-color-literals -- design spec overlay alpha; not a design token
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(35,31,33,0.55)',
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
      marginBottom: 12,
    },
    body: {
      fontFamily: 'Inter',
      fontSize: 14.5,
      lineHeight: 14.5 * 1.55,
      color: c.fg.secondary,
      marginBottom: 16,
    },
    countNote: {
      fontFamily: 'JetBrains Mono',
      fontSize: 12,
      color: c.fg.tertiary,
      marginBottom: 24,
    },
    button: {
      borderWidth: 1,
      borderColor: c.border.divider,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
    },
    buttonText: {
      fontFamily: 'Inter',
      fontSize: 15,
      fontWeight: '500',
      color: c.fg.primary,
    },
  });
}

export function LimitActiveSheet({ visible, activeCount, onClose }: LimitActiveSheetProps) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.overlay} onPress={onClose} accessible={false} />
      <View style={styles.sheet}>
        <View style={styles.handle} accessibilityRole="none" />
        <Text style={styles.title}>{t('limit.active.title')}</Text>
        <Text style={styles.body}>{t('limit.active.body')}</Text>
        <Text style={styles.countNote}>
          {t('profile.active.count', { n: String(activeCount) })}
        </Text>
        <Pressable
          style={styles.button}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('limit.active.cta')}
        >
          <Text style={styles.buttonText}>{t('limit.active.cta')}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}
