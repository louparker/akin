import { Fragment, useMemo } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';
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

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    // eslint-disable-next-line react-native/no-color-literals -- overlay alpha
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(31,31,33,0.55)',
    },
    sheet: {
      backgroundColor: c.bg.base,
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
      marginBottom: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 24,
      // Reserve room on the right for the selected-indicator dot, so when it
      // appears the title/description don't reflow.
      paddingRight: 22,
      // Anchor for the absolutely-positioned checkAnchor below.
      position: 'relative',
    },
    divider: {
      height: 1,
      backgroundColor: c.border.divider,
      marginTop: 12,
      marginBottom: 12,
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
      color: c.fg.primary,
      marginBottom: 6,
    },
    rowTitleActive: {
      color: c.brand.primary,
    },
    rowDesc: {
      fontFamily: 'Inter',
      fontSize: 13,
      color: c.fg.tertiary,
      lineHeight: 13 * 1.5,
    },
    // checkAnchor is a full-height column anchored to the right edge of the row.
    // justifyContent: 'center' inside it centres the dot vertically against the
    // row's full height — independent of rowMain's content layout, font metrics,
    // or whether the description wraps.
    checkAnchor: {
      position: 'absolute',
      right: 0,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      paddingRight: 4,
    },
    check: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: c.brand.primary,
    },
  });
}

export function CategoryPickerSheet({
  visible,
  selected,
  onSelect,
  onClose,
}: CategoryPickerSheetProps) {
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
        <Text style={styles.title} testID="category-picker-title">
          {t('create.picker.title')}
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {POST_CATEGORIES.map((cat, idx) => {
            const active = cat === selected;
            const isLast = idx === POST_CATEGORIES.length - 1;
            return (
              <Fragment key={cat}>
                <Pressable
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
                  {active ? (
                    <View
                      style={styles.checkAnchor}
                      pointerEvents="none"
                      accessibilityRole="image"
                      accessibilityLabel={t('common.selected')}
                    >
                      <View style={styles.check} />
                    </View>
                  ) : null}
                </Pressable>
                {/* Divider sits between Pressables in flow (not absolute).
                    The row's symmetric paddingVertical gives equal breathing room
                    above and below the line, regardless of font metrics. */}
                {!isLast ? <View style={styles.divider} /> : null}
              </Fragment>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}
