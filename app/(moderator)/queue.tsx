import { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/composed/TopBar';
import { useModeratorQueue } from '@/features/moderation/api/useModeratorQueue';
import { timeAgo } from '@/features/feed/api/timeAgo';
import type { Enums } from '@/types/database';
import type { ReportRow } from '@/features/moderation/api/useModeratorQueue';

type ReasonFilter = Enums<'report_reason'> | null;

const FILTERS: { label: string; value: ReasonFilter }[] = [
  { label: t('mod.queue.filter.all'), value: null },
  { label: t('mod.queue.filter.harassment'), value: 'harassment' },
  { label: t('mod.queue.filter.hate'), value: 'hate' },
  { label: t('mod.queue.filter.sexual'), value: 'sexual' },
  { label: t('mod.queue.filter.threat'), value: 'threat' },
];

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg.base,
    },
    backIcon: { fontFamily: 'Inter', fontSize: 28, color: c.fg.primary, paddingHorizontal: 4 },
    depthBadge: {
      fontFamily: 'Inter',
      fontSize: 13,
      color: c.fg.tertiary,
    },
    filterRow: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      gap: 8,
    },
    chip: {
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: c.bg.raised,
      borderWidth: 1,
      borderColor: c.border.hairline,
    },
    chipActive: {
      backgroundColor: c.bg.inverse,
      borderColor: c.bg.inverse,
    },
    chipText: {
      fontFamily: 'Inter',
      fontSize: 13,
      color: c.fg.secondary,
    },
    chipTextActive: {
      color: c.fg.inverse,
    },
    loader: {
      marginTop: 40,
    },
    emptyText: {
      fontFamily: 'Inter',
      fontSize: 15,
      color: c.fg.tertiary,
      textAlign: 'center',
      marginTop: 60,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 22,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.hairline,
    },
    rowMeta: {
      gap: 3,
    },
    rowReason: {
      fontFamily: 'Inter',
      fontSize: 15,
      color: c.fg.primary,
      textTransform: 'capitalize',
    },
    rowTarget: {
      fontFamily: 'Inter',
      fontSize: 12.5,
      color: c.fg.tertiary,
    },
    rowAge: {
      fontFamily: 'Inter',
      fontSize: 12.5,
      color: c.fg.tertiary,
    },
  });
}

export default function ModeratorQueueScreen() {
  const [filter, setFilter] = useState<ReasonFilter>(null);
  const {
    data: reports,
    isLoading,
    refetch,
    isRefetching,
  } = useModeratorQueue({
    reasonFilter: filter,
  });

  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  const openCount = reports?.length ?? 0;

  return (
    <View style={styles.container}>
      <TopBar
        title={t('mod.queue.title')}
        left={
          <Pressable
            onPress={() => router.push('/(main)/settings')}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        }
        right={
          openCount > 0 ? (
            <Text style={styles.depthBadge}>{t('mod.queue.depth', { n: String(openCount) })}</Text>
          ) : undefined
        }
      />

      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.value ?? 'all'}
            style={[styles.chip, filter === f.value && styles.chipActive]}
            onPress={() => setFilter(f.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.value }}
          >
            <Text style={[styles.chipText, filter === f.value && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={c.fg.tertiary} />
      ) : (
        <FlashList
          data={reports ?? []}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />
          }
          renderItem={({ item }) => <ReportQueueRow report={item} styles={styles} />}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('mod.queue.empty')}</Text>}
        />
      )}
    </View>
  );
}

function ReportQueueRow({
  report,
  styles,
}: {
  report: ReportRow;
  styles: ReturnType<typeof makeStyles>;
}) {
  const targetLabel =
    report.target_type === 'post'
      ? t('mod.report.target.post')
      : report.target_type === 'comment'
        ? t('mod.report.target.comment')
        : t('mod.report.target.user');

  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(`/(moderator)/report/${report.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${targetLabel} — ${report.reason} — ${timeAgo(report.created_at)}`}
    >
      <View style={styles.rowMeta}>
        <Text style={styles.rowReason}>{report.reason.replace('_', ' ')}</Text>
        <Text style={styles.rowTarget}>{targetLabel}</Text>
      </View>
      <Text style={styles.rowAge}>{timeAgo(report.created_at)}</Text>
    </Pressable>
  );
}
