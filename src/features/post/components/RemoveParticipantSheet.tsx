import { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import { IdentChip } from '@/components/composed/IdentChip';
import { useRemoveParticipant, RemoveParticipantError } from '../api/useRemoveParticipant';

export interface RemovableParticipant {
  userId: string;
  identifier: string;
}

interface RemoveParticipantSheetProps {
  visible: boolean;
  postId: string;
  participants: RemovableParticipant[];
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
      lineHeight: 22 * 1.25,
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
    empty: {
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.tertiary,
      paddingVertical: 16,
      textAlign: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
    },
    rowBordered: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.hairline,
    },
    removeLink: {
      fontFamily: 'Inter',
      fontSize: 14,
      fontWeight: '500',
      color: c.semantic.danger,
    },
    confirmButton: {
      backgroundColor: c.semantic.danger,
      borderRadius: 8,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 12,
    },
    confirmDisabled: {
      opacity: 0.5,
    },
    confirmText: {
      fontFamily: 'Inter',
      fontSize: 15,
      fontWeight: '500',
      color: c.fg.inverse,
    },
    cancelButton: {
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelText: {
      fontFamily: 'Inter',
      fontSize: 14,
      color: c.fg.secondary,
    },
  });
}

/**
 * Two-step OP action: pick a participant, then confirm.
 *
 * Renders ONLY when the caller has already verified `post.author_id === me`
 * (i.e. only the OP opens this sheet). Server-side RLS in 0017 is the source
 * of truth; this is UI prevention.
 */
export function RemoveParticipantSheet({
  visible,
  postId,
  participants,
  onClose,
}: RemoveParticipantSheetProps) {
  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);
  const [selected, setSelected] = useState<RemovableParticipant | null>(null);
  const { mutate: removeParticipant, isPending } = useRemoveParticipant();

  useEffect(() => {
    if (visible) setSelected(null);
  }, [visible]);

  function handleConfirm() {
    if (!selected || isPending) return;
    removeParticipant(
      { postId, removedUserId: selected.userId },
      {
        onSuccess: () => {
          setSelected(null);
          onClose();
        },
        onError: (err) => {
          const message =
            err instanceof RemoveParticipantError && err.kind === 'forbidden'
              ? t('post.removeParticipant.error.forbidden')
              : t('error.network');
          Alert.alert(message);
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

        {selected === null ? (
          <>
            <Text style={styles.title}>{t('post.removeParticipant.sheet.title')}</Text>
            <Text style={styles.body}>{t('post.removeParticipant.sheet.warning')}</Text>

            {participants.length === 0 ? (
              <Text style={styles.empty}>{t('post.removeParticipant.empty')}</Text>
            ) : (
              participants.map((p, idx) => {
                const isLast = idx === participants.length - 1;
                return (
                  <Pressable
                    key={p.userId}
                    style={[styles.row, isLast ? undefined : styles.rowBordered]}
                    onPress={() => setSelected(p)}
                    accessibilityRole="button"
                    accessibilityLabel={t('post.removeParticipant.pick', { name: p.identifier })}
                  >
                    <IdentChip name={p.identifier} />
                    <Text style={styles.removeLink}>{t('post.removeParticipant.pickCta')}</Text>
                  </Pressable>
                );
              })
            )}
          </>
        ) : (
          <>
            <Text style={styles.title}>
              {t('post.removeParticipant.confirm.title', { name: selected.identifier })}
            </Text>
            <Text style={styles.body}>{t('post.removeParticipant.confirm.body')}</Text>

            <Pressable
              style={[styles.confirmButton, isPending && styles.confirmDisabled]}
              onPress={handleConfirm}
              disabled={isPending}
              accessibilityRole="button"
              accessibilityLabel={t('post.removeParticipant.confirm.cta', {
                name: selected.identifier,
              })}
              accessibilityState={{ disabled: isPending }}
            >
              {isPending ? (
                <ActivityIndicator color={c.fg.inverse} />
              ) : (
                <Text style={styles.confirmText}>
                  {t('post.removeParticipant.confirm.cta', { name: selected.identifier })}
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setSelected(null)}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}
