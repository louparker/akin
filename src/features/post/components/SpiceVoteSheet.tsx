import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { SpiceFlames } from '@/components/composed/SpiceFlames';
import { useVoteSpice } from '../api/useVoteSpice';

interface SpiceLevel {
  level: 1 | 2 | 3 | 4 | 5;
  labelKey: 'spice.1.label' | 'spice.2.label' | 'spice.3.label' | 'spice.4.label' | 'spice.5.label';
  descKey: 'spice.1.desc' | 'spice.2.desc' | 'spice.3.desc' | 'spice.4.desc' | 'spice.5.desc';
}

const SPICE_LEVELS: SpiceLevel[] = [
  { level: 1, labelKey: 'spice.1.label', descKey: 'spice.1.desc' },
  { level: 2, labelKey: 'spice.2.label', descKey: 'spice.2.desc' },
  { level: 3, labelKey: 'spice.3.label', descKey: 'spice.3.desc' },
  { level: 4, labelKey: 'spice.4.label', descKey: 'spice.4.desc' },
  { level: 5, labelKey: 'spice.5.label', descKey: 'spice.5.desc' },
];

interface SpiceVoteSheetProps {
  postId: string;
  visible: boolean;
  userVote: number | null;
  onClose: () => void;
}

export function SpiceVoteSheet({ postId, visible, userVote, onClose }: SpiceVoteSheetProps) {
  const { mutate: voteSpice, isPending } = useVoteSpice(postId);
  const readOnly = userVote !== null;

  function handleSelect(level: number) {
    if (readOnly || isPending) return;
    voteSpice({ level }, { onSuccess: onClose });
  }

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
        <Text style={styles.title}>{t('spice.sheet.title')}</Text>
        <Text style={styles.body}>{t('spice.sheet.body')}</Text>
        <ScrollView>
          {SPICE_LEVELS.map(({ level, labelKey, descKey }) => {
            const isSelected = userVote === level;
            return (
              <Pressable
                key={level}
                style={[styles.row, isSelected ? styles.rowSelected : styles.rowUnselected]}
                onPress={() => handleSelect(level)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected, disabled: readOnly && !isSelected }}
                accessibilityLabel={`${t(labelKey)}: ${t(descKey)}`}
              >
                <SpiceFlames level={level} size={14} />
                <View style={styles.rowText}>
                  <Text style={styles.rowLabel}>{t(labelKey)}</Text>
                  <Text style={styles.rowDesc}>{t(descKey)}</Text>
                </View>
                {isSelected ? <Text style={styles.checkmark}>✓</Text> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // eslint-disable-next-line react-native/no-color-literals -- design spec overlay alpha; not a design token
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(35,31,33,0.55)',
  },
  sheet: {
    backgroundColor: colors.bg.base,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
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
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.fg.primary,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    lineHeight: 13.5 * 1.5,
    color: colors.fg.secondary,
    marginBottom: 22,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  rowSelected: {
    borderColor: colors.fg.primary,
    backgroundColor: colors.bg.raised,
  },
  rowUnselected: {
    borderColor: colors.border.hairline,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    fontWeight: '500',
    color: colors.fg.primary,
  },
  rowDesc: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: colors.fg.secondary,
    marginTop: 1,
  },
  checkmark: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.fg.primary,
    fontWeight: '600',
  },
});
