import { Modal, View, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { Button } from '@/components/primitives/Button';
import type { SortOrder } from '../store/useFeedStore';

interface FilterSheetProps {
  visible: boolean;
  sort: SortOrder;
  minSpice: number;
  onSortChange: (sort: SortOrder) => void;
  onMinSpiceChange: (n: number) => void;
  onApply: () => void;
  onClose: () => void;
}

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'recent', label: 'feed.sort.recent' as const },
  { value: 'comments', label: 'feed.sort.comments' as const },
  { value: 'spice', label: 'feed.sort.spice' as const },
];

const SPICE_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'feed.filter.minSpice.any' as const },
  { value: 1, label: '1+' },
  { value: 2, label: '2+' },
  { value: 3, label: '3+' },
  { value: 4, label: '4+' },
  { value: 5, label: '5+' },
];

export function FilterSheet({
  visible,
  sort,
  minSpice,
  onSortChange,
  onMinSpiceChange,
  onApply,
  onClose,
}: FilterSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel="Close filter sheet" />
      <View style={styles.sheet}>
        <View style={styles.handle} accessibilityElementsHidden />

        <Text style={styles.title}>{t('feed.filter.title')}</Text>
        <View style={styles.titleDivider} />

        {/* Sort section */}
        <View style={styles.section}>
          <Text style={styles.eyebrow}>{t('feed.filter.sortBy').toUpperCase()}</Text>
          {SORT_OPTIONS.map((option, index) => (
            <Pressable
              key={option.value}
              style={[styles.sortRow, index < SORT_OPTIONS.length - 1 && styles.sortRowDivider]}
              onPress={() => onSortChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: sort === option.value }}
              accessibilityLabel={t(option.label as Parameters<typeof t>[0])}
            >
              <Text style={styles.sortLabel}>{t(option.label as Parameters<typeof t>[0])}</Text>
              {sort === option.value && (
                <Text style={styles.checkmark} accessibilityElementsHidden>
                  ✓
                </Text>
              )}
            </Pressable>
          ))}
        </View>

        {/* Spice section */}
        <View style={styles.spiceSection}>
          <Text style={styles.eyebrow}>{t('feed.filter.minSpice').toUpperCase()}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.spiceChips}
          >
            {SPICE_OPTIONS.map((option) => {
              const isActive = minSpice === option.value;
              const label = option.value === 0 ? t('feed.filter.minSpice.any') : option.label;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.spiceChip, isActive && styles.spiceChipActive]}
                  onPress={() => onMinSpiceChange(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isActive }}
                  accessibilityLabel={label}
                >
                  <Text style={[styles.spiceChipLabel, isActive && styles.spiceChipLabelActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Apply button */}
        <View style={styles.applyContainer}>
          <Button kind="primary" full onPress={onApply} accessibilityLabel={t('feed.filter.cta')}>
            {t('feed.filter.cta')}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // eslint-disable-next-line react-native/no-color-literals -- design spec overlay alpha; not a design token
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(35,31,33,0.4)',
  },
  sheet: {
    backgroundColor: colors.bg.base,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 14,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.divider,
    alignSelf: 'center',
    marginBottom: 18,
  },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.fg.primary,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  titleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
  },
  section: {
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 8,
  },
  eyebrow: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10.5,
    color: colors.fg.secondary,
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sortRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  sortLabel: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.fg.primary,
  },
  checkmark: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '700',
    color: colors.fg.primary,
  },
  spiceSection: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  spiceChips: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  spiceChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border.divider,
    alignItems: 'center',
    minWidth: 44,
  },
  spiceChipActive: {
    borderColor: colors.fg.primary,
    backgroundColor: colors.bg.raised,
  },
  spiceChipLabel: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.fg.secondary,
    textAlign: 'center',
  },
  spiceChipLabelActive: {
    fontWeight: '500',
    color: colors.fg.primary,
  },
  applyContainer: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
});
