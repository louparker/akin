// "You" tab — Profile-mine screen.
// Identifier + join month + tabs (My Posts | My Active) + gear → settings.
// Phase 8 (pulled forward 2026-05-27) — see phase-8 task 8.1.
import { useState, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';

import { colors } from '@/theme/colors';
import { t, locale } from '@/lib/i18n';
import { TopBar } from '@/components/composed/TopBar';
import { PostCard } from '@/components/composed/PostCard';
import { IconSettings } from '@/components/composed/icons/IconSettings';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useMyPosts, type PostRow } from '@/features/profile/api/useMyPosts';
import { useMyActiveConversations } from '@/features/profile/api/useMyActiveConversations';
import { timeAgo } from '@/features/feed/api/timeAgo';

type Tab = 'posts' | 'active';

function formatJoinedMonth(isoDate: string): string {
  // Intl handles the localised "Month YYYY" — no need for a t() string.
  const d = new Date(isoDate);
  return new Intl.DateTimeFormat(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export default function YouScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [activeTab, setActiveTab] = useState<Tab>('posts');

  const myPostsQuery = useMyPosts();
  const myActiveQuery = useMyActiveConversations();

  const activeQuery = activeTab === 'posts' ? myPostsQuery : myActiveQuery;
  const posts: PostRow[] = activeQuery.data ?? [];

  const joinedLabel = useMemo(() => {
    if (!profile?.created_at) return '';
    return t('profile.joinedOn', { month: formatJoinedMonth(profile.created_at) });
  }, [profile?.created_at]);

  const renderItem = useCallback(
    ({ item }: { item: PostRow }) => (
      <PostCard
        id={item.id}
        category={t(`category.${item.category}` as const)}
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

  const emptyKey = activeTab === 'posts' ? 'profile.empty.myPosts' : 'profile.empty.myActive';

  return (
    <View style={styles.container}>
      <TopBar
        title={t('profile.title')}
        right={
          <Pressable
            onPress={() => router.push('/(main)/settings')}
            accessibilityRole="button"
            accessibilityLabel={t('settings.title')}
            hitSlop={8}
            style={styles.gearPressable}
          >
            <IconSettings size={22} />
          </Pressable>
        }
      />

      <FlashList
        data={posts}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={
          <View>
            <View style={styles.headerBlock}>
              <Text style={styles.identifier} numberOfLines={1}>
                {profile?.anonymous_identifier ?? ''}
              </Text>
              {joinedLabel ? <Text style={styles.joined}>{joinedLabel}</Text> : null}
            </View>

            <View style={styles.tabRow} accessibilityRole="tablist">
              <TabButton
                label={t('profile.tab.myPosts')}
                active={activeTab === 'posts'}
                onPress={() => setActiveTab('posts')}
              />
              <TabButton
                label={t('profile.tab.myActive')}
                active={activeTab === 'active'}
                onPress={() => setActiveTab('active')}
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          activeQuery.isLoading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{t(emptyKey)}</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={activeQuery.isRefetching}
            onRefresh={() => void activeQuery.refetch()}
            tintColor={colors.fg.tertiary}
          />
        }
      />
    </View>
  );
}

interface TabButtonProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function TabButton({ label, active, onPress }: TabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={styles.tabButton}
      hitSlop={8}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
      {active ? <View style={styles.tabUnderline} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  gearPressable: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  headerBlock: {
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  identifier: {
    fontFamily: 'Source Serif 4',
    fontSize: 30,
    lineHeight: 30 * 1.1,
    letterSpacing: -0.4,
    color: colors.fg.primary,
    marginBottom: 6,
  },
  joined: {
    fontFamily: 'Inter',
    fontSize: 13,
    color: colors.fg.tertiary,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    gap: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.hairline,
  },
  tabButton: {
    paddingVertical: 10,
    position: 'relative',
  },
  tabLabel: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: colors.fg.tertiary,
  },
  tabLabelActive: {
    color: colors.fg.primary,
    fontWeight: '500',
  },
  tabUnderline: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1.5,
    backgroundColor: colors.fg.primary,
  },
  empty: {
    paddingTop: 56,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.fg.tertiary,
    textAlign: 'center',
    maxWidth: 280,
  },
});
