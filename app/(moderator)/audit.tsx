import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/composed/TopBar';
import { useAuditLog, type AuditEntry } from '@/features/moderation/api/useAuditLog';
import { timeAgo } from '@/features/feed/api/timeAgo';

export default function AuditLogScreen() {
  const [page, setPage] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const { data, isLoading, isFetching } = useAuditLog({ page });

  const entries = data?.entries ?? [];
  const total = data?.total ?? 0;
  const hasMore = (page + 1) * 50 < total;

  return (
    <View style={styles.container}>
      <TopBar
        title={t('mod.audit.title')}
        left={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        }
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={colors.fg.tertiary} />
      ) : (
        <FlashList
          data={entries}
          keyExtractor={(e) => String(e.id)}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => setSelectedEntry(item)}
              accessibilityRole="button"
            >
              <View style={styles.rowLeft}>
                <Text style={styles.action}>{item.action}</Text>
                <Text style={styles.target}>{`${item.target_type}: ${item.target_id ?? '—'}`}</Text>
              </View>
              <Text style={styles.age}>{timeAgo(item.created_at)}</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{t('mod.audit.empty')}</Text>}
          ListFooterComponent={
            hasMore ? (
              <Pressable
                style={styles.loadMore}
                onPress={() => setPage((p) => p + 1)}
                disabled={isFetching}
              >
                <Text style={styles.loadMoreText}>
                  {isFetching ? t('common.loading') : 'Load more'}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}

      {/* Entry detail modal */}
      <Modal
        visible={selectedEntry !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEntry(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedEntry(null)}
          accessible={false}
        />
        {selectedEntry ? (
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{selectedEntry.action}</Text>
            <Text style={styles.modalMeta}>{timeAgo(selectedEntry.created_at)}</Text>
            <ScrollView style={styles.metadataScroll}>
              <Text style={styles.metadataJson}>
                {JSON.stringify(selectedEntry.metadata, null, 2)}
              </Text>
            </ScrollView>
            <Pressable
              style={styles.closeButton}
              onPress={() => setSelectedEntry(null)}
              accessibilityRole="button"
            >
              <Text style={styles.closeText}>{t('common.close')}</Text>
            </Pressable>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  backIcon: { fontFamily: 'Inter', fontSize: 28, color: colors.fg.primary, paddingHorizontal: 4 },
  loader: { marginTop: 40 },
  emptyText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.fg.tertiary,
    textAlign: 'center',
    marginTop: 60,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  rowLeft: { gap: 3 },
  action: { fontFamily: 'Inter', fontSize: 14, color: colors.fg.primary },
  target: { fontFamily: 'Inter', fontSize: 12, color: colors.fg.tertiary },
  age: { fontFamily: 'Inter', fontSize: 12, color: colors.fg.tertiary },
  loadMore: { paddingVertical: 20, alignItems: 'center' },
  loadMoreText: { fontFamily: 'Inter', fontSize: 14, color: colors.brand.primary },
  // eslint-disable-next-line react-native/no-color-literals -- design spec overlay alpha
  modalOverlay: { flex: 1, backgroundColor: 'rgba(35,31,33,0.55)' },
  modalSheet: {
    backgroundColor: colors.bg.base,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '70%',
    gap: 10,
  },
  modalTitle: { fontFamily: 'Source Serif 4', fontSize: 20, color: colors.fg.primary },
  modalMeta: { fontFamily: 'Inter', fontSize: 12, color: colors.fg.tertiary },
  metadataScroll: { maxHeight: 200 },
  metadataJson: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    color: colors.fg.secondary,
    backgroundColor: colors.bg.raised,
    padding: 12,
    borderRadius: 6,
  },
  closeButton: {
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: colors.bg.raised,
    alignItems: 'center',
    marginTop: 4,
  },
  closeText: { fontFamily: 'Inter', fontSize: 15, color: colors.fg.primary },
});
