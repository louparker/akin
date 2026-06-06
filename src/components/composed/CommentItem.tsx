import React, { memo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { IdentChip } from './IdentChip';
import { timeAgo } from '@/features/feed/api/timeAgo';
import { useEditComment, EditCommentError } from '@/features/post/api/useEditComment';
import { useDeleteComment } from '@/features/post/api/useDeleteComment';
import type { Tables } from '@/types/database';

type CommentRow = Tables<'comments'>;

const EDIT_WINDOW_MS = 15 * 60 * 1000;

function isWithinEditWindow(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < EDIT_WINDOW_MS;
}

export interface CommentItemProps {
  comment: CommentRow & { pending?: boolean };
  postId: string;
  isOpComment: boolean;
  currentUserId: string;
  onReport: (commentId: string) => void;
  onBlock: (authorId: string) => void;
}

export const CommentItem = memo(function CommentItem({
  comment,
  postId,
  isOpComment,
  currentUserId,
  onReport,
  onBlock,
}: CommentItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [editError, setEditError] = useState<string | null>(null);

  const { mutate: editComment, isPending: isEditing } = useEditComment(postId);
  const { mutate: deleteComment } = useDeleteComment(postId);

  const isOwn = comment.author_id === currentUserId;
  const withinWindow = isWithinEditWindow(comment.created_at);
  const canEditDelete = isOwn && withinWindow;

  const isDeleted = comment.status === 'deleted';
  const isRemovedByOp = comment.removed_by_op;

  function handleMenuPress() {
    setShowMenu(true);
  }

  function handleEditPress() {
    setShowMenu(false);
    setEditBody(comment.body);
    setEditError(null);
    setEditing(true);
  }

  function handleEditSave() {
    const trimmed = editBody.trim();
    if (!trimmed || isEditing) return;

    editComment(
      { commentId: comment.id, body: trimmed },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => {
          if (err instanceof EditCommentError && err.kind === 'window_closed') {
            setEditError(t('comment.edit.error.windowClosed'));
          } else {
            setEditError(t('error.network'));
          }
        },
      },
    );
  }

  function handleEditCancel() {
    setEditing(false);
    setEditError(null);
  }

  function handleDeletePress() {
    setShowMenu(false);
    Alert.alert(t('comment.delete.confirm.title'), t('comment.delete.confirm.body'), [
      { text: t('comment.delete.confirm.cancel'), style: 'cancel' },
      {
        text: t('comment.delete.confirm.cta'),
        style: 'destructive',
        onPress: () =>
          deleteComment(
            { commentId: comment.id },
            { onError: () => Alert.alert(t('error.network')) },
          ),
      },
    ]);
  }

  function handleReportPress() {
    setShowMenu(false);
    onReport(comment.id);
  }

  function handleBlockPress() {
    setShowMenu(false);
    onBlock(comment.author_id);
  }

  const bodyContent = () => {
    if (isDeleted) {
      return (
        <Text testID="comment-deleted" style={[styles.body, styles.bodyMuted]}>
          {t('comment.deleted')}
        </Text>
      );
    }
    if (isRemovedByOp) {
      return (
        <Text testID="comment-removed-by-op" style={[styles.body, styles.bodyMuted]}>
          {t('post.comment.removedByOp')}
        </Text>
      );
    }
    if (editing) {
      return (
        <View>
          <TextInput
            testID="comment-edit-input"
            style={styles.editInput}
            value={editBody}
            onChangeText={(text) => {
              setEditBody(text);
              setEditError(null);
            }}
            multiline
            maxLength={1000}
            accessibilityLabel={t('comment.action.edit')}
          />
          {editError ? (
            <Text testID="comment-edit-error" style={styles.editError}>
              {editError}
            </Text>
          ) : null}
          <View style={styles.editActions}>
            <Pressable
              testID="comment-edit-cancel"
              onPress={handleEditCancel}
              accessibilityRole="button"
              style={styles.editBtn}
            >
              <Text style={styles.editBtnSecondary}>{t('comment.edit.cancel')}</Text>
            </Pressable>
            <Pressable
              testID="comment-edit-save"
              onPress={handleEditSave}
              disabled={!editBody.trim() || isEditing}
              accessibilityRole="button"
              style={[styles.editBtn, styles.editBtnPrimary]}
            >
              {isEditing ? (
                <ActivityIndicator size="small" color={colors.fg.inverse} />
              ) : (
                <Text style={styles.editBtnPrimaryText}>{t('comment.edit.save')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      );
    }
    return <Text style={[styles.body, comment.pending && styles.bodyMuted]}>{comment.body}</Text>;
  };

  return (
    <View style={[styles.container, comment.pending && styles.containerPending]}>
      <View style={styles.header}>
        <IdentChip name={comment.author_identifier} you={isOwn} />
        {isOpComment ? (
          <Text testID="op-badge" style={styles.opBadge}>
            {t('post.op.badge')}
          </Text>
        ) : null}
        <View style={styles.flex1} />
        {!isDeleted && !isRemovedByOp ? (
          <Pressable
            testID="comment-menu-btn"
            onPress={handleMenuPress}
            accessibilityRole="button"
            accessibilityLabel={t('comment.menu.report')}
            style={styles.menuBtn}
          >
            <Text style={styles.menuIcon}>⋯</Text>
          </Pressable>
        ) : null}
        <Text style={styles.time}>{timeAgo(comment.created_at)}</Text>
      </View>

      {bodyContent()}

      {comment.pending ? (
        <Text testID="comment-sending" style={styles.sendingText}>
          {t('comment.sending')}
        </Text>
      ) : null}

      {/* Action sheet */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setShowMenu(false)}
          accessibilityLabel={t('common.close')}
        >
          <View style={styles.sheet}>
            {canEditDelete ? (
              <>
                <Pressable
                  style={styles.sheetItem}
                  onPress={handleEditPress}
                  accessibilityRole="button"
                >
                  <Text style={styles.sheetItemText}>{t('comment.action.edit')}</Text>
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  style={styles.sheetItem}
                  onPress={handleDeletePress}
                  accessibilityRole="button"
                >
                  <Text style={[styles.sheetItemText, styles.danger]}>
                    {t('comment.action.delete')}
                  </Text>
                </Pressable>
              </>
            ) : !isOwn ? (
              <>
                <Pressable
                  style={styles.sheetItem}
                  onPress={handleReportPress}
                  accessibilityRole="button"
                >
                  <Text style={styles.sheetItemText}>{t('comment.menu.report')}</Text>
                </Pressable>
                <View style={styles.divider} />
                <Pressable
                  style={styles.sheetItem}
                  onPress={handleBlockPress}
                  accessibilityRole="button"
                >
                  <Text style={[styles.sheetItemText, styles.danger]}>
                    {t('comment.action.block')}
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.hairline,
  },
  containerPending: {
    opacity: 0.55,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  opBadge: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10.5,
    color: colors.brand.primary,
    textTransform: 'uppercase',
  },
  flex1: { flex: 1 },
  menuBtn: { paddingHorizontal: 4 },
  menuIcon: {
    fontFamily: 'Inter',
    fontSize: 14,
    color: colors.fg.tertiary,
  },
  time: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.fg.tertiary,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 14.5,
    lineHeight: 14.5 * 1.55,
    color: colors.fg.secondary,
  },
  bodyMuted: {
    fontStyle: 'italic',
    color: colors.fg.tertiary,
  },
  sendingText: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: colors.fg.tertiary,
    marginTop: 4,
  },
  // Inline edit
  editInput: {
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.divider,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'Inter',
    fontSize: 14.5,
    color: colors.fg.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editError: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.semantic.danger,
    marginTop: 4,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  editBtnPrimary: {
    backgroundColor: colors.bg.inverse,
    minWidth: 60,
    alignItems: 'center',
  },
  editBtnSecondary: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    color: colors.fg.secondary,
  },
  editBtnPrimaryText: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.fg.inverse,
  },
  // Action sheet modal
  // eslint-disable-next-line react-native/no-color-literals -- design spec overlay alpha; not a design token
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(35,31,33,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.base,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  sheetItem: {
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  sheetItemText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.fg.primary,
  },
  danger: { color: colors.semantic.danger },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
    marginHorizontal: 22,
  },
});
