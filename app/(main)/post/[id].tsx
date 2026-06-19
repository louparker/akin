import { useState, useRef } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/composed/TopBar';
import { CommentItem } from '@/components/composed/CommentItem';
import { IdentChip } from '@/components/composed/IdentChip';
import { CapacityDots } from '@/components/composed/CapacityDots';
import { ActiveConversationsPill } from '@/components/composed/ActiveConversationsPill';
import { SpiceFlames } from '@/components/composed/SpiceFlames';
import { CategoryTag } from '@/components/composed/CategoryTag';
import { Skeleton } from '@/components/composed/Skeleton';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { usePost } from '@/features/post/api/usePost';
import { useCreateComment, CreateCommentError } from '@/features/post/api/useCreateComment';
import { useBlock } from '@/features/post/api/useBlock';
import { SpiceVoteSheet } from '@/features/post/components/SpiceVoteSheet';
import { LimitActiveSheet } from '@/features/post/components/LimitActiveSheet';
import { ReportSheet } from '@/features/post/components/ReportSheet';
import {
  RemoveParticipantSheet,
  type RemovableParticipant,
} from '@/features/post/components/RemoveParticipantSheet';
import { useFullTransition } from '@/features/post/api/useFullTransition';
import { timeAgo } from '@/features/feed/api/timeAgo';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuthStore();
  const { data: post, isLoading, isError } = usePost(id ?? '');
  const { mutate: createComment, isPending: isSubmitting } = useCreateComment(id ?? '');
  const { mutate: blockUser } = useBlock();
  const { showNotice: showFullNotice, dismiss: dismissFullNotice } = useFullTransition(
    post?.is_full,
  );

  const [replyText, setReplyText] = useState('');
  const [replyFilterError, setReplyFilterError] = useState<string | null>(null);
  const [showSpiceSheet, setShowSpiceSheet] = useState(false);
  const [showLimitSheet, setShowLimitSheet] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showRemoveSheet, setShowRemoveSheet] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    type: 'post' | 'comment' | 'user';
  } | null>(null);

  const inputRef = useRef<TextInput>(null);

  const currentUserId = session?.user.id ?? '';
  const isParticipant =
    post !== undefined &&
    (post.author_id === currentUserId || post.comments.some((c) => c.author_id === currentUserId));
  const isOP = post !== undefined && post.author_id === currentUserId;

  // Participants the OP can remove: unique non-OP commenters who haven't already been removed.
  const removableParticipants: RemovableParticipant[] =
    post === undefined
      ? []
      : Array.from(
          new Map(
            post.comments
              .filter((c) => c.author_id !== post.author_id && !c.removed_by_op)
              .map((c) => [c.author_id, { userId: c.author_id, identifier: c.author_identifier }]),
          ).values(),
        );

  const canReply = post !== undefined && (!post.is_full || isParticipant);
  const showFullBanner = post?.is_full === true && !isParticipant;

  // Check if the current user has already voted for spice
  // We don't have per-user vote data in the query result — derive from spice_vote_count only.
  // For simplicity treat as "not voted" when we don't have user-specific vote data.
  // A production implementation would join spice_votes for the current user.
  const userSpiceVote: number | null = null;

  function handleSendReply() {
    const body = replyText.trim();
    if (!body || isSubmitting) return;

    setReplyFilterError(null);
    createComment(
      { body },
      {
        onSuccess: () => {
          setReplyText('');
          inputRef.current?.blur();
        },
        onError: (err) => {
          if (err instanceof CreateCommentError && err.kind === 'active_limit') {
            setShowLimitSheet(true);
          } else if (err instanceof CreateCommentError && err.kind === 'post_full') {
            Alert.alert(t('limit.full.error'));
          } else if (err instanceof CreateCommentError && err.kind === 'removed_from_post') {
            Alert.alert(t('post.comment.error.removedFromPost'), undefined, [
              { text: t('common.ok'), onPress: () => router.back() },
            ]);
          } else if (err instanceof CreateCommentError && err.kind === 'content_filter') {
            setReplyFilterError(t('error.CONTENT_FILTER_HIT.comment'));
          } else if (err instanceof CreateCommentError && err.kind === 'contact_info') {
            setReplyFilterError(t('error.CONTACT_INFO_NOT_ALLOWED.comment'));
          } else {
            Alert.alert(t('error.network'));
          }
        },
      },
    );
  }

  function handleSpiceTap() {
    if (userSpiceVote === null) {
      setShowSpiceSheet(true);
    }
  }

  function handleMoreMenu() {
    setShowMoreMenu(true);
  }

  function handleReportPost() {
    setShowMoreMenu(false);
    if (post) {
      setReportTarget({ id: post.id, type: 'post' });
    }
  }

  function handleRemoveParticipant() {
    setShowMoreMenu(false);
    setShowRemoveSheet(true);
  }

  function handleBlockUser() {
    setShowMoreMenu(false);
    if (!post) return;
    Alert.alert(t('block.confirm.title'), t('block.confirm.body'), [
      { text: t('block.confirm.cancel'), style: 'cancel' },
      {
        text: t('block.confirm.cta'),
        style: 'destructive',
        onPress: () => blockUser({ blocked_id: post.author_id, postId: post.id }),
      },
    ]);
  }

  function handleReportComment(commentId: string) {
    setReportTarget({ id: commentId, type: 'comment' });
  }

  function handleReportPerson(authorId: string) {
    setReportTarget({ id: authorId, type: 'user' });
  }

  const categoryLabel = post ? t(`category.${post.category}`) : '';

  const capacityKey = post?.is_full ? 'post.capacity.full' : 'post.capacity';
  const capacityText = post ? t(capacityKey, { filled: String(post.participant_count) }) : '';

  const avgSpice =
    post && post.spice_vote_count > 0 ? (post.average_spice_level ?? 0).toFixed(1) : '—';

  if (isLoading) {
    return (
      <View style={styles.container}>
        <TopBar
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
        <View style={styles.skeletonContainer}>
          <Skeleton width="60%" height={14} style={styles.skeletonItem} />
          <Skeleton width="90%" height={24} style={styles.skeletonItem} />
          <Skeleton width="100%" height={14} style={styles.skeletonItem} />
          <Skeleton width="100%" height={14} style={styles.skeletonItem} />
          <Skeleton width="80%" height={14} style={styles.skeletonItem} />
        </View>
      </View>
    );
  }

  if (isError || !post) {
    return (
      <View style={styles.container}>
        <TopBar
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
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('feed.error.title')}</Text>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* TopBar */}
      <TopBar
        left={
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
          >
            <Text style={styles.backIcon}>‹</Text>
          </Pressable>
        }
        right={
          <Pressable
            onPress={handleMoreMenu}
            accessibilityRole="button"
            accessibilityLabel="More options"
          >
            <Text style={styles.moreIcon}>⋯</Text>
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={showFullBanner ? styles.scrollContentFull : styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Post section */}
        <View style={styles.postSection}>
          <View style={styles.metaRow}>
            <CategoryTag name={categoryLabel} />
            <View style={styles.metaDot} />
            <Text style={styles.metaTime}>{timeAgo(post.created_at)}</Text>
          </View>

          <Text testID="post-title" style={styles.postTitle}>
            {post.title}
          </Text>
          <Text style={styles.postBody}>{post.body}</Text>

          <View style={styles.authorRow}>
            <View style={styles.authorLeftCol}>
              <IdentChip name={post.author_identifier} you={post.author_id === currentUserId} />
              <ActiveConversationsPill count={profile?.active_post_count ?? 0} />
            </View>
            <View style={styles.capacityContainer}>
              <CapacityDots filled={post.participant_count} total={4} size={7} />
              <Text style={styles.capacityText}>{capacityText}</Text>
            </View>
          </View>
        </View>

        {/* Spice section */}
        <Pressable
          style={styles.spiceSection}
          onPress={handleSpiceTap}
          accessibilityRole="button"
          accessibilityLabel={`${t('post.spice.label')}: ${avgSpice} ${t('post.spice.average', { avg: avgSpice })}`}
          disabled={userSpiceVote !== null}
        >
          <View style={styles.spiceLeft}>
            <Text style={styles.spiceEyebrow}>{t('post.spice.label').toUpperCase()}</Text>
            <SpiceFlames level={Math.round(post.average_spice_level ?? 0)} size={16} />
          </View>
          <View style={styles.spiceRight}>
            <Text style={styles.spiceStat}>{t('post.spice.average', { avg: avgSpice })}</Text>
            <Text style={styles.spiceStat}>
              {t('post.spice.votes', { n: String(post.spice_vote_count) })}
            </Text>
          </View>
        </Pressable>

        {/* Replies header */}
        <View style={styles.repliesHeader}>
          <Text style={styles.repliesLabel}>
            {t('post.replies.label', { n: String(post.comment_count) }).toUpperCase()}
          </Text>
        </View>

        {/* Full notice — appears only when the post transitions to full during this session */}
        {showFullNotice ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.fullNotice}
            testID="full-notice"
          >
            <Text style={styles.fullNoticeText}>{t('post.full.notice')}</Text>
            <Pressable
              onPress={dismissFullNotice}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={styles.fullNoticeDismiss}
            >
              <Text style={styles.fullNoticeDismissIcon}>×</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {/* Comments list */}
        {post.comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            postId={post.id}
            isOpComment={comment.author_id === post.author_id}
            currentUserId={currentUserId}
            onReport={handleReportComment}
            onReportPerson={handleReportPerson}
            onBlock={(authorId) => blockUser({ blocked_id: authorId, postId: post.id })}
          />
        ))}
      </ScrollView>

      {/* Reply bar or full banner */}
      {showFullBanner ? (
        <View style={[styles.fullBanner, { paddingBottom: Math.max(insets.bottom, 16) + 14 }]}>
          <Text style={styles.fullBannerRow}>
            <Text style={styles.fullBannerLock}>🔒 </Text>
            <Text style={styles.fullBannerTitle}>{t('post.full.lock')}</Text>
          </Text>
          <Text style={styles.fullBannerBody}>{t('post.full.body')}</Text>
        </View>
      ) : (
        <View style={[styles.replyBar, { paddingBottom: Math.max(insets.bottom, 8) + 4 }]}>
          {replyFilterError ? (
            <View style={styles.filterErrorRow}>
              <Text style={styles.filterErrorText}>{replyFilterError} </Text>
              <Pressable
                onPress={() =>
                  void Linking.openURL('mailto:hi@akin.app?subject=Content%20filter%20appeal')
                }
                accessibilityRole="link"
                accessibilityLabel={t('error.contact_support')}
              >
                <Text style={styles.filterErrorLink}>{t('error.contact_support')}</Text>
              </Pressable>
            </View>
          ) : null}
          <View style={styles.replyInputRow}>
            <TextInput
              ref={inputRef}
              style={styles.replyInput}
              placeholder={t('post.reply.placeholder')}
              placeholderTextColor={colors.fg.faint}
              value={replyText}
              onChangeText={setReplyText}
              multiline={false}
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSendReply}
              editable={canReply && !isSubmitting}
              accessibilityLabel={t('post.reply.placeholder')}
              testID="post-reply-input"
            />
            <Pressable
              style={[
                styles.sendButton,
                (!replyText.trim() || !canReply) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendReply}
              disabled={!replyText.trim() || !canReply || isSubmitting}
              accessibilityRole="button"
              accessibilityLabel={t('post.send.label')}
              accessibilityState={{ disabled: !replyText.trim() || !canReply || isSubmitting }}
              testID="post-send-button"
            >
              {isSubmitting ? (
                <ActivityIndicator color={colors.fg.inverse} size="small" />
              ) : (
                <Text style={styles.sendIcon}>›</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Sheets */}
      <SpiceVoteSheet
        postId={post.id}
        visible={showSpiceSheet}
        userVote={userSpiceVote}
        onClose={() => setShowSpiceSheet(false)}
      />

      <LimitActiveSheet
        visible={showLimitSheet}
        activeCount={profile?.active_post_count ?? 3}
        onClose={() => setShowLimitSheet(false)}
      />

      {reportTarget ? (
        <ReportSheet
          visible={reportTarget !== null}
          targetId={reportTarget.id}
          targetType={reportTarget.type}
          onClose={() => setReportTarget(null)}
        />
      ) : null}

      <RemoveParticipantSheet
        visible={showRemoveSheet}
        postId={post.id}
        participants={removableParticipants}
        onClose={() => setShowRemoveSheet(false)}
      />

      {/* More menu */}
      <Modal
        visible={showMoreMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreMenu(false)}
      >
        <Pressable
          style={styles.menuOverlay}
          onPress={() => setShowMoreMenu(false)}
          accessibilityLabel={t('common.close')}
        >
          <View style={styles.menuSheet}>
            <Pressable
              style={styles.menuItem}
              onPress={handleReportPost}
              accessibilityRole="button"
              accessibilityLabel={t('post.menu.report')}
            >
              <Text style={styles.menuItemText}>{t('post.menu.report')}</Text>
            </Pressable>
            {isOP && removableParticipants.length > 0 ? (
              <>
                <View style={styles.menuDivider} />
                <Pressable
                  style={styles.menuItem}
                  onPress={handleRemoveParticipant}
                  accessibilityRole="button"
                  accessibilityLabel={t('post.menu.removeParticipant')}
                >
                  <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                    {t('post.menu.removeParticipant')}
                  </Text>
                </Pressable>
              </>
            ) : null}
            {isOP ? null : (
              <>
                <View style={styles.menuDivider} />
                <Pressable
                  style={styles.menuItem}
                  onPress={handleBlockUser}
                  accessibilityRole="button"
                  accessibilityLabel={t('post.menu.block')}
                >
                  <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                    {t('post.menu.block')}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  scrollContentFull: {
    paddingBottom: 120,
  },
  // Loading / error states
  skeletonContainer: {
    padding: 22,
    gap: 12,
  },
  skeletonItem: {
    marginBottom: 0,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.fg.secondary,
  },
  retryText: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '500',
    color: colors.brand.primary,
  },
  // TopBar slots
  backIcon: {
    fontFamily: 'Inter',
    fontSize: 28,
    color: colors.fg.primary,
    lineHeight: 32,
    paddingHorizontal: 4,
  },
  moreIcon: {
    fontFamily: 'Inter',
    fontSize: 20,
    color: colors.fg.primary,
    paddingHorizontal: 4,
  },
  // Post section
  postSection: {
    paddingTop: 8,
    paddingHorizontal: 22,
    paddingBottom: 22,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.fg.tertiary,
  },
  metaTime: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.fg.secondary,
  },
  postTitle: {
    fontFamily: 'Source Serif 4',
    fontSize: 24,
    lineHeight: 24 * 1.25,
    letterSpacing: -0.3,
    color: colors.fg.primary,
    marginBottom: 14,
  },
  postBody: {
    fontFamily: 'Inter',
    fontSize: 15,
    lineHeight: 15 * 1.6,
    color: colors.fg.secondary,
    marginBottom: 18,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  authorLeftCol: {
    gap: 6,
    flex: 1,
    marginRight: 12,
  },
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  capacityText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11.5,
    color: colors.fg.secondary,
  },
  // Spice section
  spiceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.hairline,
  },
  spiceLeft: {
    gap: 6,
  },
  spiceEyebrow: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.fg.secondary,
  },
  spiceRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  spiceStat: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: colors.fg.secondary,
  },
  // Replies header
  repliesHeader: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 8,
  },
  repliesLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10.5,
    letterSpacing: 1.2,
    color: colors.fg.secondary,
  },
  // Reply bar
  replyBar: {
    flexDirection: 'column',
    backgroundColor: colors.bg.base,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.hairline,
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 6,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 2,
  },
  filterErrorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  filterErrorText: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: colors.semantic.danger,
  },
  filterErrorLink: {
    fontFamily: 'Inter',
    fontSize: 12.5,
    color: colors.brand.primary,
    textDecorationLine: 'underline',
  },
  replyInput: {
    flex: 1,
    backgroundColor: colors.bg.raised,
    borderWidth: 1,
    borderColor: colors.border.divider,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'Inter',
    fontSize: 14.5,
    color: colors.fg.primary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bg.inverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    fontFamily: 'Inter',
    fontSize: 22,
    color: colors.fg.inverse,
    lineHeight: 26,
    marginLeft: 2,
  },
  // Full banner
  fullBanner: {
    backgroundColor: colors.bg.raised,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.hairline,
    paddingHorizontal: 22,
    paddingTop: 18,
  },
  fullBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fullBannerLock: {
    fontSize: 14,
  },
  fullBannerTitle: {
    fontFamily: 'Inter',
    fontSize: 13.5,
    fontWeight: '500',
    color: colors.fg.primary,
  },
  fullBannerBody: {
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colors.fg.secondary,
  },
  // More menu
  // eslint-disable-next-line react-native/no-color-literals -- design spec overlay alpha; not a design token
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(35,31,33,0.45)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    backgroundColor: colors.bg.base,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 0,
    paddingBottom: 40,
    paddingTop: 8,
  },
  menuItem: {
    paddingVertical: 16,
    paddingHorizontal: 22,
  },
  menuItemText: {
    fontFamily: 'Inter',
    fontSize: 15,
    color: colors.fg.primary,
  },
  menuItemDanger: {
    color: colors.semantic.danger,
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairline,
    marginHorizontal: 22,
  },
  // Full-transition notice
  fullNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 22,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.bg.raised,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.divider,
  },
  fullNoticeText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: colors.fg.secondary,
  },
  fullNoticeDismiss: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  fullNoticeDismissIcon: {
    fontFamily: 'Inter',
    fontSize: 18,
    color: colors.fg.tertiary,
    lineHeight: 20,
  },
});
