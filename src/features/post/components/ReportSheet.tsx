import { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import type { Enums } from '@/types/database';
import { useReport, ReportError } from '../api/useReport';

type ReportTarget = Enums<'report_target'>;
type ReportReason = Enums<'report_reason'>;

interface ReasonOption {
  reason: ReportReason;
  labelKey: TranslationKey;
}

// 6 options matching the design spec. "Identifying someone" is doxxing —
// the closest enum value is 'harassment'. Two entries mapped to 'other'
// previously; now only "Something else" maps to 'other'.
const REASON_OPTIONS: ReasonOption[] = [
  { reason: 'harassment', labelKey: 'report.reason.harassment' },
  { reason: 'harassment', labelKey: 'report.reason.identifying' },
  { reason: 'hate', labelKey: 'report.reason.hate' },
  { reason: 'sexual', labelKey: 'report.reason.sexual' },
  { reason: 'spam', labelKey: 'report.reason.spam' },
  { reason: 'other', labelKey: 'report.reason.other' },
];

interface ReportSheetProps {
  visible: boolean;
  targetId: string;
  targetType: ReportTarget;
  onClose: () => void;
}

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    // eslint-disable-next-line react-native/no-color-literals -- design spec overlay alpha; not a design token
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(35,31,33,0.55)',
    },
    sheet: {
      backgroundColor: c.bg.base,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 22,
      paddingTop: 12,
      paddingBottom: 36,
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
      fontSize: 22,
      letterSpacing: -0.3,
      color: c.fg.primary,
      marginBottom: 8,
    },
    body: {
      fontFamily: 'Inter',
      fontSize: 13.5,
      lineHeight: 13.5 * 1.5,
      color: c.fg.secondary,
      marginBottom: 20,
    },
    errorText: {
      fontFamily: 'Inter',
      fontSize: 13.5,
      color: c.semantic.danger,
      marginBottom: 12,
    },
    reasonRow: {
      paddingVertical: 13,
    },
    reasonRowBordered: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.hairline,
    },
    reasonRowInner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: c.border.divider,
    },
    radioSelected: {
      borderColor: c.brand.primary,
      backgroundColor: c.brand.primary,
    },
    reasonText: {
      fontFamily: 'Inter',
      fontSize: 15,
      color: c.fg.primary,
      flex: 1,
    },
    reasonSelected: {
      fontWeight: '500',
    },
    notesInput: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border.divider,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.primary,
      minHeight: 72,
      marginTop: 8,
      marginBottom: 4,
    },
    submitButton: {
      backgroundColor: c.bg.inverse,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
      marginBottom: 8,
    },
    submitDisabled: {
      opacity: 0.4,
    },
    submitText: {
      fontFamily: 'Inter',
      fontSize: 15,
      fontWeight: '500',
      color: c.fg.inverse,
    },
    success: {
      fontFamily: 'Inter',
      fontSize: 15,
      color: c.semantic.success,
      textAlign: 'center',
      paddingVertical: 24,
    },
  });
}

export function ReportSheet({ visible, targetId, targetType, onClose }: ReportSheetProps) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [rateLimitError, setRateLimitError] = useState(false);
  const { mutate: sendReport, isPending } = useReport();

  useEffect(() => {
    if (visible) {
      setSelectedIdx(null);
      setNotes('');
      setShowSuccess(false);
      setRateLimitError(false);
    }
  }, [visible]);

  const titleKey: TranslationKey =
    targetType === 'post'
      ? 'report.title.post'
      : targetType === 'user'
        ? 'report.title.user'
        : 'report.title.comment';

  // eslint-disable-next-line security/detect-object-injection -- selectedIdx is a controlled state index bounded to REASON_OPTIONS.length
  const selectedOption = selectedIdx !== null ? REASON_OPTIONS[selectedIdx] : null;
  const isOther =
    selectedOption?.reason === 'other' && selectedOption?.labelKey === 'report.reason.other';
  const canSubmit = selectedIdx !== null && (!isOther || notes.trim().length > 0) && !isPending;

  function handleSubmit() {
    if (!canSubmit || selectedOption == null) return;
    setRateLimitError(false);
    sendReport(
      {
        target_id: targetId,
        target_type: targetType,
        reason: selectedOption.reason,
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          setShowSuccess(true);
          setTimeout(onClose, 2000);
        },
        onError: (err) => {
          if (err instanceof ReportError && err.kind === 'rate_limit') {
            setRateLimitError(true);
          }
        },
      },
    );
  }

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
        <Text style={styles.title}>{t(titleKey)}</Text>
        <Text style={styles.body}>{t('report.body')}</Text>

        {showSuccess ? (
          <Text style={styles.success}>{t('report.success')}</Text>
        ) : (
          <>
            {rateLimitError ? (
              <Text style={styles.errorText}>{t('report.error.rateLimit')}</Text>
            ) : null}

            {REASON_OPTIONS.map((option, idx) => {
              const isLast = idx === REASON_OPTIONS.length - 1;
              const isSelected = selectedIdx === idx;
              return (
                <Pressable
                  key={`${option.reason}-${option.labelKey}`}
                  style={[styles.reasonRow, isLast ? undefined : styles.reasonRowBordered]}
                  onPress={() => setSelectedIdx(idx)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSelected }}
                  accessibilityLabel={t(option.labelKey)}
                >
                  <View style={styles.reasonRowInner}>
                    <View style={[styles.radioCircle, isSelected && styles.radioSelected]} />
                    <Text style={[styles.reasonText, isSelected && styles.reasonSelected]}>
                      {t(option.labelKey)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {isOther ? (
              <TextInput
                style={styles.notesInput}
                placeholder={t('report.notes.placeholder')}
                placeholderTextColor={c.fg.faint}
                value={notes}
                onChangeText={setNotes}
                multiline
                maxLength={500}
                accessibilityLabel={t('report.notes.label')}
                testID="report-notes-input"
              />
            ) : null}

            <Pressable
              style={[styles.submitButton, !canSubmit && styles.submitDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel={t('report.cta')}
              accessibilityState={{ disabled: !canSubmit }}
            >
              {isPending ? (
                <ActivityIndicator color={c.fg.inverse} />
              ) : (
                <Text style={styles.submitText}>{t('report.cta')}</Text>
              )}
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}
