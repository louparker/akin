import { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/composed/TopBar';
import { useModeratorReport } from '@/features/moderation/api/useModeratorReport';
import {
  useModerateReport,
  ModerateReportError,
  type ModerationAction,
} from '@/features/moderation/api/useModerateReport';
import { buildActions } from '@/features/moderation/utils/buildActions';
import { timeAgo } from '@/features/feed/api/timeAgo';

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg.base },
    backIcon: { fontFamily: 'Inter', fontSize: 28, color: c.fg.primary, paddingHorizontal: 4 },
    loader: { marginTop: 40 },
    errorText: {
      fontFamily: 'Inter',
      fontSize: 15,
      color: c.fg.tertiary,
      textAlign: 'center',
      marginTop: 40,
    },
    scroll: { paddingBottom: 60 },
    section: { marginBottom: 24 },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 22,
      paddingVertical: 13,
      backgroundColor: c.bg.raised,
    },
    metaLabel: { fontFamily: 'Inter', fontSize: 14, color: c.fg.tertiary, flex: 1 },
    metaValue: {
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.primary,
      flex: 2,
      textAlign: 'right',
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.hairline,
    },
    actionRow: { paddingHorizontal: 22, paddingVertical: 16, backgroundColor: c.bg.raised },
    actionLabel: { fontFamily: 'Inter', fontSize: 15, color: c.fg.primary },
    actionDanger: { color: c.semantic.danger },
    // eslint-disable-next-line react-native/no-color-literals -- design spec overlay alpha
    modalOverlay: { flex: 1, backgroundColor: 'rgba(35,31,33,0.55)' },
    modalSheet: {
      backgroundColor: c.bg.base,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 36,
      gap: 12,
    },
    modalTitle: { fontFamily: 'Source Serif 4', fontSize: 22, color: c.fg.primary },
    modalSubtitle: {
      fontFamily: 'Inter',
      fontSize: 13,
      color: c.fg.tertiary,
      letterSpacing: 0.5,
    },
    reasonInput: {
      borderWidth: 1,
      borderColor: c.border.divider,
      borderRadius: 8,
      padding: 12,
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.primary,
      minHeight: 80,
    },
    reasonInputError: { borderColor: c.semantic.danger },
    reasonErrorText: { fontFamily: 'Inter', fontSize: 13, color: c.semantic.danger },
    modalButtons: { flexDirection: 'row', gap: 12 },
    cancelButton: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border.divider,
      alignItems: 'center',
    },
    cancelText: { fontFamily: 'Inter', fontSize: 15, color: c.fg.secondary },
    confirmButton: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 8,
      backgroundColor: c.semantic.danger,
      alignItems: 'center',
    },
    confirmText: { fontFamily: 'Inter', fontSize: 15, fontWeight: '600', color: c.fg.inverse },
  });
}

export default function ModeratorReportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: report, isLoading, isError } = useModeratorReport(id ?? '');
  const { mutate: moderateReport, isPending } = useModerateReport();

  const [pendingAction, setPendingAction] = useState<ModerationAction | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);

  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  function handleActionPress(action: ModerationAction) {
    setReason('');
    setReasonError(false);
    setPendingAction(action);
  }

  function handleConfirm() {
    if (!pendingAction) return;
    if (!reason.trim()) {
      setReasonError(true);
      return;
    }
    moderateReport(
      { reportId: id ?? '', action: pendingAction, reason },
      {
        onSuccess: () => {
          setPendingAction(null);
          Alert.alert(t('mod.action.success'), undefined, [
            { text: t('common.ok'), onPress: () => router.back() },
          ]);
        },
        onError: (err) => {
          setPendingAction(null);
          if (err instanceof ModerateReportError && err.kind === 'no_reason') {
            setReasonError(true);
          } else {
            Alert.alert(t('error.generic'));
          }
        },
      },
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TopBar
          title={t('mod.report.title')}
          left={
            <Pressable onPress={() => router.back()} accessibilityRole="button">
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
          }
        />
        <ActivityIndicator style={styles.loader} color={c.fg.tertiary} />
      </View>
    );
  }

  if (isError || !report) {
    return (
      <View style={styles.container}>
        <TopBar
          title={t('mod.report.title')}
          left={
            <Pressable onPress={() => router.back()} accessibilityRole="button">
              <Text style={styles.backIcon}>‹</Text>
            </Pressable>
          }
        />
        <Text style={styles.errorText}>{t('error.generic')}</Text>
      </View>
    );
  }

  const targetLabel =
    report.target_type === 'post'
      ? t('mod.report.target.post')
      : report.target_type === 'comment'
        ? t('mod.report.target.comment')
        : t('mod.report.target.user');

  const actions = buildActions(report.reportedIdentifier, report.targetStrikeCount);

  return (
    <View style={styles.container}>
      <TopBar
        title={t('mod.report.title')}
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

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Report metadata */}
        <View style={styles.section}>
          <Row
            label={t('mod.report.reason')}
            value={report.reason.replace('_', ' ')}
            styles={styles}
          />
          <Row label="Target" value={`${targetLabel}: ${report.target_id}`} styles={styles} />
          <Row label="Filed" value={timeAgo(report.created_at)} styles={styles} />
          {report.notes ? (
            <Row label={t('mod.report.notes')} value={report.notes} styles={styles} />
          ) : null}
          <Row label="Status" value={report.status} styles={styles} />
          {report.reporterIdentifier ? (
            <Row
              label={t('mod.report.reporter')}
              value={report.reporterIdentifier}
              styles={styles}
            />
          ) : null}
          {report.reportedIdentifier ? (
            <Row
              label={t('mod.report.against')}
              value={report.reportedIdentifier}
              isLast
              styles={styles}
            />
          ) : (
            <Row label={t('mod.report.against')} value="—" isLast styles={styles} />
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.section}>
          {actions.map((cfg, i) => (
            <Pressable
              key={cfg.action}
              style={[styles.actionRow, i < actions.length - 1 && styles.rowDivider]}
              onPress={() => handleActionPress(cfg.action)}
              accessibilityRole="button"
            >
              <Text style={[styles.actionLabel, cfg.destructive && styles.actionDanger]}>
                {cfg.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Action confirmation modal */}
      <Modal
        visible={pendingAction !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingAction(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPendingAction(null)}
          accessible={false}
        />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{t('mod.action.confirm.title')}</Text>
          <Text style={styles.modalSubtitle}>{pendingAction?.replace('_', ' ').toUpperCase()}</Text>
          <TextInput
            style={[styles.reasonInput, reasonError && styles.reasonInputError]}
            placeholder={t('mod.action.confirm.reason.placeholder')}
            placeholderTextColor={c.fg.faint}
            value={reason}
            onChangeText={(v) => {
              setReason(v);
              setReasonError(false);
            }}
            multiline
            testID="moderator-reason-input"
          />
          {reasonError ? (
            <Text style={styles.reasonErrorText}>{t('mod.action.error.noReason')}</Text>
          ) : null}
          <View style={styles.modalButtons}>
            <Pressable
              style={styles.cancelButton}
              onPress={() => setPendingAction(null)}
              accessibilityRole="button"
            >
              <Text style={styles.cancelText}>{t('mod.action.confirm.cancel')}</Text>
            </Pressable>
            <Pressable
              style={styles.confirmButton}
              onPress={handleConfirm}
              disabled={isPending}
              accessibilityRole="button"
            >
              {isPending ? (
                <ActivityIndicator color={c.fg.inverse} size="small" />
              ) : (
                <Text style={styles.confirmText}>{t('mod.action.confirm.cta')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({
  label,
  value,
  isLast,
  styles,
}: {
  label: string;
  value: string;
  isLast?: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[styles.metaRow, !isLast && styles.rowDivider]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}
