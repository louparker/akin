import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import type { SortOrder } from '../store/useFeedStore';

interface FeedHeaderProps {
  tab: 'all' | 'categories';
  sort?: SortOrder;
  onSortPress?: () => void;
}

function sortLabel(sort: SortOrder): string {
  if (sort === 'recent') return t('feed.sort.recent');
  if (sort === 'comments') return t('feed.sort.comments');
  return t('feed.sort.spice');
}

export function FeedHeader({ tab, sort, onSortPress }: FeedHeaderProps) {
  const title = tab === 'all' ? 'akin' : t('feed.tab.categories');

  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>{title}</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => router.navigate('/(main)/feed' as Href)}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'all' }}
          accessibilityLabel={t('feed.tab.all')}
        >
          <Text style={[styles.tab, tab === 'all' && styles.tabActive]}>{t('feed.tab.all')}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.navigate('/(main)/feed/categories' as Href)}
          accessibilityRole="tab"
          accessibilityState={{ selected: tab === 'categories' }}
          accessibilityLabel={t('feed.tab.categories')}
        >
          <Text style={[styles.tab, tab === 'categories' && styles.tabActive]}>
            {t('feed.tab.categories')}
          </Text>
        </Pressable>
        {sort !== undefined && onSortPress !== undefined && (
          <Pressable
            onPress={onSortPress}
            accessibilityRole="button"
            accessibilityLabel={sortLabel(sort)}
            style={styles.sortButton}
          >
            <Text style={styles.sortLabel}>{sortLabel(sort)} ↓</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingHorizontal: 22,
    paddingBottom: 14,
    backgroundColor: colors.bg.base,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  wordmark: {
    fontFamily: 'Source Serif 4',
    fontSize: 30,
    lineHeight: 30 * 1.1,
    letterSpacing: -0.5,
    color: colors.fg.primary,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  tab: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: colors.fg.secondary,
    paddingBottom: 4,
  },
  tabActive: {
    fontWeight: '500',
    color: colors.fg.primary,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.fg.primary,
  },
  sortButton: {
    marginLeft: 'auto',
  },
  sortLabel: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: colors.fg.secondary,
  },
});
