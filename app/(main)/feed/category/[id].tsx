import { useMemo, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, router } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import { PostCard } from '@/components/composed/PostCard';
import { Skeleton } from '@/components/composed/Skeleton';
import { TopBar } from '@/components/composed/TopBar';
import { useFeed } from '@/features/feed/api/useFeed';
import { useFeedStore } from '@/features/feed/store/useFeedStore';
import { FilterSheet } from '@/features/feed/components/FilterSheet';
import { timeAgo } from '@/features/feed/api/timeAgo';
import type { Tables, Enums } from '@/types/database';

type PostRow = Tables<'posts'>;
type PostCategory = Enums<'post_category'>;

const ALL_CATEGORIES: PostCategory[] = [
  'vent_space',
  'all_the_feels',
  'advice_needed',
  'just_wondering',
  'story_time',
  'decode_this',
  'aitoo',
  'hypothetically',
  'good_vibes',
];

function isValidCategory(id: string): id is PostCategory {
  return (ALL_CATEGORIES as string[]).includes(id);
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg.base,
    },
    backButton: {
      padding: 8,
    },
    backArrow: {
      fontFamily: 'Inter',
      fontSize: 22,
      color: c.fg.primary,
      lineHeight: 26,
    },
    categoryHeader: {
      paddingTop: 8,
      paddingHorizontal: 22,
      paddingBottom: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.hairline,
    },
    eyebrow: {
      fontFamily: 'JetBrains Mono',
      fontSize: 11,
      color: c.fg.secondary,
      letterSpacing: 1.4,
      marginBottom: 8,
    },
    categoryTitle: {
      fontFamily: 'Source Serif 4',
      fontSize: 32,
      lineHeight: 32 * 1.05,
      letterSpacing: -0.5,
      color: c.fg.primary,
      marginBottom: 8,
    },
    categoryDesc: {
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.secondary,
      lineHeight: 14 * 1.5,
    },
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 16,
    },
    filterChip: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderRadius: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.divider,
    },
    filterChipText: {
      fontFamily: 'Inter',
      fontSize: 12.5,
      color: c.fg.secondary,
    },
    skeletonItem: {
      paddingHorizontal: 22,
      paddingTop: 28,
      paddingBottom: 36,
      borderBottomWidth: 1,
      borderBottomColor: c.border.divider,
      gap: 10,
    },
    skeletonMeta: {
      marginBottom: 2,
    },
    skeletonTitle: {
      marginBottom: 4,
    },
    skeletonLine: {},
    centeredState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
      gap: 12,
    },
    stateTitle: {
      fontFamily: 'Source Serif 4',
      fontSize: 20,
      color: c.fg.primary,
      textAlign: 'center',
      lineHeight: 26,
      letterSpacing: -0.2,
    },
    stateBody: {
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.secondary,
      textAlign: 'center',
      lineHeight: 14 * 1.5,
    },
    retryButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.fg.primary,
    },
    retryText: {
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: '500',
      color: c.fg.primary,
    },
    ctaButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 4,
      backgroundColor: c.bg.inverse,
    },
    ctaText: {
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: '500',
      color: c.fg.inverse,
    },
  });
}

function PostSkeleton({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.skeletonItem}>
      <Skeleton width={80} height={14} borderRadius={3} style={styles.skeletonMeta} />
      <Skeleton width="90%" height={20} borderRadius={3} style={styles.skeletonTitle} />
      <Skeleton width="100%" height={14} borderRadius={3} style={styles.skeletonLine} />
      <Skeleton width="70%" height={14} borderRadius={3} style={styles.skeletonLine} />
    </View>
  );
}

export default function CategoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [filterVisible, setFilterVisible] = useState(false);
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  // eslint-disable-next-line @typescript-eslint/unbound-method -- Zustand store actions are arrow-function closures, not this-bound methods
  const { sort, minSpice, setSort, setMinSpice } = useFeedStore();

  const category = isValidCategory(id) ? id : undefined;

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useFeed({ sort, minSpice, category });

  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: PostRow }) => (
      <PostCard
        id={item.id}
        category={item.category}
        timeAgo={timeAgo(item.created_at)}
        title={item.title}
        excerpt={item.body}
        authorIdentifier={item.author_identifier}
        participantCount={item.participant_count}
        isFull={item.is_full}
        spiceLevel={item.average_spice_level ?? undefined}
        onPress={() => router.push(`/(main)/post/${item.id}`)}
      />
    ),
    [],
  );

  const keyExtractor = useCallback((item: PostRow) => item.id, []);

  const categoryNameKey = category ? (`category.${category}` as Parameters<typeof t>[0]) : null;
  const categoryDescKey = category
    ? (`category.${category}.desc` as Parameters<typeof t>[0])
    : null;
  const categoryName = categoryNameKey ? t(categoryNameKey) : '';
  const categoryDesc = categoryDescKey ? t(categoryDescKey) : '';

  const sortLabel =
    sort === 'recent'
      ? t('feed.sort.recent')
      : sort === 'comments'
        ? t('feed.sort.comments')
        : t('feed.sort.spice');
  const spiceLabel = minSpice > 0 ? `${minSpice}+ flames` : t('feed.filter.minSpice.any');

  function BackButton() {
    return (
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backButton}
      >
        <Text style={styles.backArrow}>‹</Text>
      </Pressable>
    );
  }

  const renderHeader = () => (
    <View style={styles.categoryHeader}>
      <Text style={styles.eyebrow}>{t('category.detail.filterLabel').toUpperCase()}</Text>
      <Text style={styles.categoryTitle}>{categoryName}</Text>
      <Text style={styles.categoryDesc}>{categoryDesc}</Text>
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setFilterVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={spiceLabel}
          style={styles.filterChip}
        >
          <Text style={styles.filterChipText}>{spiceLabel}</Text>
        </Pressable>
        <Pressable
          onPress={() => setFilterVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={sortLabel}
          style={styles.filterChip}
        >
          <Text style={styles.filterChipText}>{sortLabel}</Text>
        </Pressable>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TopBar left={<BackButton />} />
        {renderHeader()}
        <PostSkeleton styles={styles} />
        <PostSkeleton styles={styles} />
        <PostSkeleton styles={styles} />
        <PostSkeleton styles={styles} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <TopBar left={<BackButton />} />
        {renderHeader()}
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>{t('feed.error.title')}</Text>
          <Pressable
            onPress={() => void refetch()}
            accessibilityRole="button"
            accessibilityLabel={t('feed.error.retry')}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>{t('feed.error.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.container}>
        <TopBar left={<BackButton />} />
        {renderHeader()}
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>{t('feed.empty.title', { category: categoryName })}</Text>
          <Text style={styles.stateBody}>{t('feed.empty.body')}</Text>
          <Pressable
            onPress={() => router.push('/(main)/create')}
            accessibilityRole="button"
            accessibilityLabel={t('feed.empty.cta')}
            style={styles.ctaButton}
          >
            <Text style={styles.ctaText}>{t('feed.empty.cta')}</Text>
          </Pressable>
        </View>
        <FilterSheet
          visible={filterVisible}
          sort={sort}
          minSpice={minSpice}
          onSortChange={setSort}
          onMinSpiceChange={setMinSpice}
          onApply={() => setFilterVisible(false)}
          onClose={() => setFilterVisible(false)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar left={<BackButton />} />
      <FlashList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      />
      <FilterSheet
        visible={filterVisible}
        sort={sort}
        minSpice={minSpice}
        onSortChange={setSort}
        onMinSpiceChange={setMinSpice}
        onApply={() => setFilterVisible(false)}
        onClose={() => setFilterVisible(false)}
      />
    </View>
  );
}
