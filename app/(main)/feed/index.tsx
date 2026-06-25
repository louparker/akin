import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { router, useFocusEffect } from 'expo-router';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import { PostCard } from '@/components/composed/PostCard';
import { Skeleton } from '@/components/composed/Skeleton';
import { useFeed } from '@/features/feed/api/useFeed';
import { useFeedStore } from '@/features/feed/store/useFeedStore';
import { FeedHeader } from '@/features/feed/components/FeedHeader';
import { FilterSheet } from '@/features/feed/components/FilterSheet';
import { timeAgo } from '@/features/feed/api/timeAgo';
import type { Tables } from '@/types/database';

type PostRow = Tables<'posts'>;

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg.base,
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

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const [filterVisible, setFilterVisible] = useState(false);
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  // eslint-disable-next-line @typescript-eslint/unbound-method -- Zustand store actions are arrow-function closures, not this-bound methods
  const { sort, minSpice, setSort, setMinSpice, highlightPostId } = useFeedStore();

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useFeed({ sort, minSpice });

  const posts = data?.pages.flatMap((p) => p.data) ?? [];

  // Pull fresh data whenever the feed regains focus (e.g. after posting), so a
  // new post shows up without a manual pull-to-refresh. Skip the very first
  // focus — the query already fetched on mount.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void refetch();
    }, [refetch]),
  );

  // Once the highlighted (just-created) post is in the data, jump to the top so
  // it's visible (the feed tab keeps its old scroll position after posting),
  // let its entrance animation play, then clear the flag so it doesn't re-animate.
  const listRef = useRef<FlashListRef<PostRow>>(null);
  const highlightPresent = !!highlightPostId && posts.some((p) => p.id === highlightPostId);
  useEffect(() => {
    if (!highlightPresent) return;
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    const id = setTimeout(() => useFeedStore.getState().setHighlightPostId(null), 1200);
    return () => clearTimeout(id);
  }, [highlightPresent]);

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
        animateIn={item.id === highlightPostId}
        onPress={() => router.push(`/(main)/post/${item.id}`)}
      />
    ),
    [highlightPostId],
  );

  const keyExtractor = useCallback((item: PostRow) => item.id, []);

  const filterSheet = (
    <FilterSheet
      visible={filterVisible}
      sort={sort}
      minSpice={minSpice}
      onSortChange={setSort}
      onMinSpiceChange={setMinSpice}
      onApply={() => setFilterVisible(false)}
      onClose={() => setFilterVisible(false)}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <FeedHeader tab="all" sort={sort} onSortPress={() => setFilterVisible(true)} />
        <PostSkeleton styles={styles} />
        <PostSkeleton styles={styles} />
        <PostSkeleton styles={styles} />
        <PostSkeleton styles={styles} />
        {filterSheet}
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <FeedHeader tab="all" sort={sort} onSortPress={() => setFilterVisible(true)} />
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
        {filterSheet}
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={styles.container}>
        <FeedHeader tab="all" sort={sort} onSortPress={() => setFilterVisible(true)} />
        <View style={styles.centeredState}>
          <Text style={styles.stateTitle}>
            {t('feed.empty.title', { category: t('feed.tab.all') })}
          </Text>
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
        {filterSheet}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FeedHeader tab="all" sort={sort} onSortPress={() => setFilterVisible(true)} />
      <FlashList
        ref={listRef}
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      />
      {filterSheet}
    </View>
  );
}
