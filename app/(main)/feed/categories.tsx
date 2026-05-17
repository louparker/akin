import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { FeedHeader } from '@/features/feed/components/FeedHeader';
import type { Enums } from '@/types/database';

type PostCategory = Enums<'post_category'>;

interface CategoryMeta {
  id: PostCategory;
  nameKey: Parameters<typeof t>[0];
  descKey: Parameters<typeof t>[0];
}

const CATEGORIES: CategoryMeta[] = [
  { id: 'vent_space', nameKey: 'category.vent_space', descKey: 'category.vent_space.desc' },
  {
    id: 'all_the_feels',
    nameKey: 'category.all_the_feels',
    descKey: 'category.all_the_feels.desc',
  },
  {
    id: 'advice_needed',
    nameKey: 'category.advice_needed',
    descKey: 'category.advice_needed.desc',
  },
  {
    id: 'just_wondering',
    nameKey: 'category.just_wondering',
    descKey: 'category.just_wondering.desc',
  },
  { id: 'story_time', nameKey: 'category.story_time', descKey: 'category.story_time.desc' },
  { id: 'decode_this', nameKey: 'category.decode_this', descKey: 'category.decode_this.desc' },
  { id: 'aitoo', nameKey: 'category.aitoo', descKey: 'category.aitoo.desc' },
  {
    id: 'hypothetically',
    nameKey: 'category.hypothetically',
    descKey: 'category.hypothetically.desc',
  },
  { id: 'good_vibes', nameKey: 'category.good_vibes', descKey: 'category.good_vibes.desc' },
];

export default function CategoriesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <FeedHeader tab="categories" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {CATEGORIES.map((cat, index) => (
          <Pressable
            key={cat.id}
            style={[styles.row, index < CATEGORIES.length - 1 && styles.rowDivider]}
            onPress={() => router.push(`/(main)/feed/category/${cat.id}` as Href)}
            accessibilityRole="button"
            accessibilityLabel={t(cat.nameKey)}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.categoryName}>{t(cat.nameKey)}</Text>
              <Text style={styles.categoryDesc}>{t(cat.descKey)}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.openLabel}>{t('category.open.label').toUpperCase()}</Text>
            </View>
            <Text style={styles.chevron} accessibilityElementsHidden>
              ›
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 22,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  categoryName: {
    fontFamily: 'Source Serif 4',
    fontSize: 19,
    letterSpacing: -0.2,
    color: colors.fg.primary,
    marginBottom: 4,
  },
  categoryDesc: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.fg.secondary,
    lineHeight: 13 * 1.45,
  },
  rowRight: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  openLabel: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.fg.faint,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  chevron: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.fg.faint,
  },
});
