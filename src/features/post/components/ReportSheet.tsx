import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import type { TranslationKey } from '@/lib/i18n';
import type { Enums } from '@/types/database';
import { useReport } from '../api/useReport';

type ReportTarget = Enums<'report_target'>;
type ReportReason = Enums<'report_reason'>;

interface ReasonOption {
  reason: ReportReason;
  labelKey: TranslationKey;
}

const REASON_OPTIONS: ReasonOption[] = [
  { reason: 'harassment', labelKey: 'report.reason.harassment' },
  { reason: 'other', labelKey: 'report.reason.identifying' },
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

export function ReportSheet({ visible, targetId, targetType, onClose }: ReportSheetProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const { mutate: sendReport, isPending } = useReport();

  useEffect(() => {
    if (visible) {
      setSelectedIdx(null);
      setShowSuccess(false);
    }
  }, [visible]);

  const titleKey: TranslationKey =
    targetType === 'post' ? 'report.title.post' : 'report.title.comment';

  function handleSubmit() {
    if (selectedIdx === null || isPending) return;
    // eslint-disable-next-line security/detect-object-injection -- selectedIdx is a controlled state index bounded to REASON_OPTIONS.length
    const option = REASON_OPTIONS[selectedIdx];
    if (!option) return;
    sendReport(
      { target_id: targetId, target_type: targetType, reason: option.reason },
      {
        onSuccess: () => {
          setShowSuccess(true);
          setTimeout(onClose, 2000);
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
      <Pressable style={styles.overlay} onPress={onClose} accessibilityLabel={t('common.close')}>
        <View style={styles.sheet}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} accessibilityRole="none" />
            <Text style={styles.title}>{t(titleKey)}</Text>
            <Text style={styles.body}>{t('report.body')}</Text>

            {showSuccess ? (
              <Text style={styles.success}>{t('report.success')}</Text>
            ) : (
              <>
                {REASON_OPTIONS.map((option, idx) => {
                  const isLast = idx === REASON_OPTIONS.length - 1;
                  const isSelected = selectedIdx === idx;
                  return (
                    <Pressable
                      key={option.labelKey}
                      style={[styles.reasonRow, isLast ? undefined : styles.reasonRowBordered]}
                      onPress={() => setSelectedIdx(idx)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={t(option.labelKey)}
                    >
                      <Text style={[styles.reasonText, isSelected && styles.reasonSelected]}>
                        {t(option.labelKey)}
                      </Text>
                    </Pressable>
                  );
                })}

                <Pressable
                  style={[styles.submitButton, selectedIdx === null && styles.submitDisabled]}
                  onPress={handleSubmit}
                  disabled={selectedIdx === null || isPending}
                  accessibilityRole="button"
                  accessibilityLabel={t('report.cta')}
                  accessibilityState={{ disabled: selectedIdx === null || isPending }}
                >
                  {isPending ? (
                    <ActivityIndicator color={colors.fg.inverse} />
                  ) : (
                    <Text style={styles.submitText}>{t('report.cta')}</Text>
                  )}
                </Pressable>
              </>
            )}
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // eslint-disable-next-line react-native/no-color-literals -- design spec overlay alpha; not a design token
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(35,31,33,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.base,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border.divider,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Source Serif 4',
    fontSize: 22,
    letterSpacing: -0.3,
    color: colors.fg.primary,
    marginBottom: 8,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    lineHeight: 13.5 * 1.5,
    color: colors.fg.secondary,
    marginBottom: 20,
  },
  reasonRow: {
    paddingVertical: 13,
  },
  reasonRowBordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  reasonText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.fg.primary,
  },
  reasonSelected: {
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.bg.inverse,
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
    color: colors.fg.inverse,
  },
  success: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.semantic.success,
    textAlign: 'center',
    paddingVertical: 24,
  },
});
