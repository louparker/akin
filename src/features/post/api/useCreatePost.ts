import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import type { Enums } from '@/types/database';

// CRITICAL-PATH: posts — content filter + active-limit triggers raise SQLSTATEs we surface here.

const ERR_ACTIVE_LIMIT = 'P0003';
const ERR_CONTENT_FILTER = 'P0010';
const ERR_CONTACT_INFO = 'P0011';

export type CreatePostErrorKind =
  | 'active_limit'
  | 'content_filter'
  | 'contact_info'
  | 'network'
  | 'unauthenticated'
  | 'unknown';

export type CreatePostI18nKey =
  | 'error.USER_ACTIVE_LIMIT_REACHED'
  | 'error.CONTENT_FILTER_HIT'
  | 'error.CONTACT_INFO_NOT_ALLOWED'
  | 'error.network'
  | 'error.generic';

export class CreatePostError extends Error {
  public readonly kind: CreatePostErrorKind;
  public readonly i18nKey: CreatePostI18nKey;
  constructor(kind: CreatePostErrorKind, i18nKey: CreatePostI18nKey, message: string) {
    super(message);
    this.name = 'CreatePostError';
    this.kind = kind;
    this.i18nKey = i18nKey;
  }
}

export interface CreatePostInput {
  title: string;
  body: string;
  category: Enums<'post_category'>;
}

export interface CreatePostResult {
  id: string;
}

export function useCreatePost(): UseMutationResult<
  CreatePostResult,
  CreatePostError,
  CreatePostInput
> {
  const queryClient = useQueryClient();
  const { session, profile } = useAuthStore.getState();

  return useMutation<CreatePostResult, CreatePostError, CreatePostInput>({
    mutationFn: async ({ title, body, category }) => {
      const { session: s, profile: p } = useAuthStore.getState();
      const authedSession = s ?? session;
      const authedProfile = p ?? profile;

      if (!authedSession || !authedProfile?.anonymous_identifier) {
        throw new CreatePostError('unauthenticated', 'error.generic', 'Not authenticated');
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          title: title.trim(),
          body: body.trim(),
          category,
          author_id: authedSession.user.id,
          author_identifier: authedProfile.anonymous_identifier,
        })
        .select('id')
        .single();

      if (error) {
        const code = (error as { code?: string }).code;
        if (code === ERR_ACTIVE_LIMIT) {
          throw new CreatePostError(
            'active_limit',
            'error.USER_ACTIVE_LIMIT_REACHED',
            error.message,
          );
        }
        if (code === ERR_CONTENT_FILTER) {
          throw new CreatePostError('content_filter', 'error.CONTENT_FILTER_HIT', error.message);
        }
        if (code === ERR_CONTACT_INFO) {
          throw new CreatePostError(
            'contact_info',
            'error.CONTACT_INFO_NOT_ALLOWED',
            error.message,
          );
        }
        if (
          error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('fetch')
        ) {
          throw new CreatePostError('network', 'error.network', error.message);
        }
        throw new CreatePostError('unknown', 'error.generic', error.message);
      }

      if (!data?.id) {
        throw new CreatePostError('unknown', 'error.generic', 'No id returned');
      }

      return { id: data.id };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
