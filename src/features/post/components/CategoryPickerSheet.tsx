import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { POST_CATEGORIES } from '@/features/post/schemas/createPost';
import type { Enums } from '@/types/database';

type Category = Enums<'post_category'>;

interface CategoryPickerSheetProps {
  visible: boolean;
  selected: Category | null;
  onSelect: (category: Category) => void;
  onClose: () => void;
}

export function CategoryPickerSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: CategoryPickerSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel={t('common.close')}>
        <View style={styles.sheet}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} accessibilityRole="none" />
            <Text style={styles.title}>{t('create.picker.title')}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {POST_CATEGORIES.map((cat) => {
                const active = cat === selected;
                return (
                  <Pressable
                    key={cat}
                    onPress={() => {
                      onSelect(cat);
                      onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t(`category.${cat}` as const)}
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  >
                    <View style={styles.rowMain}>
                      <Text style={[styles.rowTitle, active && styles.rowTitleActive]}>
                        {t(`category.${cat}` as const)}
                      </Text>
                      <Text style={styles.rowDesc}>{t(`category.${cat}.desc` as const)}</Text>
                    </View>
                    {active ? <Text style={styles.check}>·</Text> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
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
    maxHeight: '85%',
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
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowMain: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: 'Source Serif 4',
    fontSize: 19,
    color: colors.fg.primary,
    marginBottom: 2,
  },
  rowTitleActive: {
    color: colors.brand.primary,
  },
  rowDesc: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.fg.tertiary,
    lineHeight: 13 * 1.5,
  },
  check: {
    fontFamily: 'Inter',
    fontSize: 24,
    color: colors.brand.primary,
    marginLeft: 12,
  },
});
