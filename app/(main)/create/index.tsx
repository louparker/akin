// CRITICAL-PATH: posts — composer for new posts. Server-side triggers enforce
// content filter, contact-info filter, and the active-post limit.
import { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useColorTokens } from '@/theme/useColorTokens';
import { t } from '@/lib/i18n';
import { TopBar } from '@/components/composed/TopBar';
import { CategoryTag } from '@/components/composed/CategoryTag';
import { ActiveConversationsPill } from '@/components/composed/ActiveConversationsPill';
import { LimitActiveSheet } from '@/features/post/components/LimitActiveSheet';
import { CategoryPickerSheet } from '@/features/post/components/CategoryPickerSheet';
import { GuidelinesSheet } from '@/features/post/components/GuidelinesSheet';
import { createPostSchema, TITLE_MAX, BODY_MAX } from '@/features/post/schemas/createPost';
import { useCreatePost, CreatePostError } from '@/features/post/api/useCreatePost';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { useUiPrefsStore } from '@/lib/uiPrefs';
import type { Enums } from '@/types/database';

type Category = Enums<'post_category'>;
const ACTIVE_LIMIT = 3;

function makeStyles(c: ReturnType<typeof useColorTokens>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.bg.base,
    },
    flex: {
      flex: 1,
    },
    scroll: {
      paddingHorizontal: 22,
      paddingTop: 8,
      paddingBottom: 24,
    },
    cancel: {
      fontFamily: 'Inter',
      fontSize: 15,
      color: c.fg.tertiary,
      paddingHorizontal: 8,
    },
    submit: {
      fontFamily: 'Inter',
      fontSize: 15,
      fontWeight: '600',
      color: c.fg.primary,
      paddingHorizontal: 8,
    },
    submitDisabled: {
      color: c.fg.faint,
    },
    categoryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border.hairline,
      gap: 12,
    },
    pressed: {
      opacity: 0.7,
    },
    categoryLabel: {
      fontFamily: 'JetBrains Mono',
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      color: c.fg.tertiary,
      flex: 0,
    },
    categoryPlaceholder: {
      flex: 1,
      fontFamily: 'Source Serif 4',
      fontSize: 18,
      color: c.fg.faint,
    },
    chevron: {
      fontFamily: 'Inter',
      fontSize: 22,
      // lineHeight matches fontSize so the glyph's line box is tight rather than
      // sitting inside default leading (which drags it visually low).
      lineHeight: 22,
      color: c.fg.tertiary,
      marginLeft: 'auto',
      // The ›  glyph has its visual mass below baseline; nudge it up so it reads
      // as vertically centered with the CATEGORY label and "Pick a category" text.
      transform: [{ translateY: -25 }],
    },
    title: {
      fontFamily: 'Source Serif 4',
      fontSize: 26,
      lineHeight: 26 * 1.25,
      letterSpacing: -0.3,
      color: c.fg.primary,
      marginTop: 20,
      minHeight: 60,
      padding: 0,
      textAlignVertical: 'top',
    },
    body: {
      fontFamily: 'Inter',
      fontSize: 15.5,
      lineHeight: 15.5 * 1.6,
      color: c.fg.secondary,
      marginTop: 12,
      minHeight: 160,
      padding: 0,
      textAlignVertical: 'top',
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.bg.raised,
      paddingHorizontal: 22,
      paddingTop: 14,
      paddingBottom: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border.hairline,
    },
    identityCol: {
      flex: 1,
      marginRight: 12,
      gap: 6,
    },
    postingAs: {
      fontFamily: 'Inter',
      fontSize: 12,
      color: c.fg.tertiary,
    },
    identifier: {
      fontFamily: 'JetBrains Mono',
      color: c.fg.primary,
    },
    counters: {
      alignItems: 'flex-end',
      gap: 2,
    },
    counter: {
      fontFamily: 'JetBrains Mono',
      fontSize: 11,
      color: c.fg.tertiary,
    },
  });
}

export default function CreateScreen() {
  const profile = useAuthStore((s) => s.profile);
  const activeCount = profile?.active_post_count ?? 0;
  const identifier = profile?.anonymous_identifier ?? '';

  const hasSeenGuidelines = useUiPrefsStore((s) => s.hasSeenCreateGuidelines);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  const atLimit = activeCount >= ACTIVE_LIMIT;
  const [limitOpen, setLimitOpen] = useState(false);

  const c = useColorTokens();
  const styles = useMemo(() => makeStyles(c), [c]);

  // Show the active-limit sheet immediately when the tab is focused if user is at cap.
  useFocusEffect(
    useCallback(() => {
      if (atLimit) setLimitOpen(true);
      else if (!hasSeenGuidelines) setGuidelinesOpen(true);
    }, [atLimit, hasSeenGuidelines]),
  );

  const createPost = useCreatePost();

  const validation = useMemo(
    () => createPostSchema.safeParse({ title, body, category }),
    [title, body, category],
  );
  const canSubmit = validation.success && !atLimit && !createPost.isPending;

  const onSubmit = async () => {
    if (!validation.success || !category) return;
    try {
      const result = await createPost.mutateAsync({
        title: title.trim(),
        body: body.trim(),
        category,
      });
      router.replace(`/(main)/post/${result.id}`);
    } catch (err) {
      const i18nKey = err instanceof CreatePostError ? err.i18nKey : 'error.generic';
      if (err instanceof CreatePostError && err.kind === 'active_limit') {
        setLimitOpen(true);
        return;
      }
      const isFilterError =
        err instanceof CreatePostError &&
        (err.kind === 'content_filter' || err.kind === 'contact_info');
      Alert.alert(t('error.generic'), t(i18nKey), [
        isFilterError
          ? {
              text: t('error.contact_support'),
              onPress: () =>
                void Linking.openURL('mailto:hi@akin.app?subject=Content%20filter%20appeal'),
            }
          : { text: t('common.ok') },
      ]);
    }
  };

  const onCancel = () => {
    if (title || body || category) {
      Alert.alert(t('create.cancel'), t('create.discardConfirm'), [
        { text: t('create.discard.keep'), style: 'cancel' },
        {
          text: t('create.discard.confirm'),
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]);
      return;
    }
    router.back();
  };

  return (
    <View style={styles.container}>
      <TopBar
        left={
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel={t('create.cancel')}
            hitSlop={8}
          >
            <Text style={styles.cancel}>{t('create.cancel')}</Text>
          </Pressable>
        }
        right={
          <Pressable
            onPress={() => {
              void onSubmit();
            }}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            accessibilityLabel={t('create.submit')}
            hitSlop={8}
          >
            <Text style={[styles.submit, !canSubmit && styles.submitDisabled]}>
              {t('create.submit')}
            </Text>
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Category selector */}
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('create.category.label')}
            style={({ pressed }) => [styles.categoryRow, pressed && styles.pressed]}
          >
            <Text style={styles.categoryLabel}>{t('create.category.label')}</Text>
            {category ? (
              <CategoryTag name={t(`category.${category}` as const)} />
            ) : (
              <Text style={styles.categoryPlaceholder}>{t('create.category.placeholder')}</Text>
            )}
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          {/* Title */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('create.title.placeholder')}
            placeholderTextColor={c.fg.faint}
            style={styles.title}
            multiline
            maxLength={TITLE_MAX}
            autoCorrect={false}
            accessibilityLabel={t('create.title.placeholder')}
            testID="create-title-input"
          />

          {/* Body */}
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder={t('create.body.placeholder')}
            placeholderTextColor={c.fg.faint}
            style={styles.body}
            multiline
            maxLength={BODY_MAX}
            autoCorrect={false}
            accessibilityLabel={t('create.body.placeholder')}
            testID="create-body-input"
          />
        </ScrollView>

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          <View style={styles.identityCol}>
            <Text style={styles.postingAs} numberOfLines={1}>
              {t('create.footer.postingAs')} <Text style={styles.identifier}>{identifier}</Text>
            </Text>
            <ActiveConversationsPill count={activeCount} />
          </View>
          <View style={styles.counters}>
            <Text style={styles.counter}>
              {t('create.charCount.title', { n: String(title.length) })}
            </Text>
            <Text style={styles.counter}>
              {t('create.charCount.body', { n: String(body.length) })}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>

      <CategoryPickerSheet
        visible={pickerOpen}
        selected={category}
        onSelect={setCategory}
        onClose={() => setPickerOpen(false)}
      />

      <GuidelinesSheet
        visible={guidelinesOpen}
        onContinue={() => {
          useUiPrefsStore.getState().markCreateGuidelinesSeen();
          setGuidelinesOpen(false);
        }}
      />

      <LimitActiveSheet
        visible={limitOpen}
        activeCount={activeCount}
        onClose={() => {
          setLimitOpen(false);
          router.replace('/(main)/feed');
        }}
      />
    </View>
  );
}
