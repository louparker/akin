import { z } from 'zod';
import type { Enums } from '@/types/database';

export const POST_CATEGORIES: readonly Enums<'post_category'>[] = [
  'vent_space',
  'all_the_feels',
  'advice_needed',
  'just_wondering',
  'story_time',
  'decode_this',
  'aitoo',
  'hypothetically',
  'good_vibes',
] as const;

export const TITLE_MAX = 150;
export const BODY_MAX = 2000;

export const createPostSchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX),
  body: z.string().trim().min(1).max(BODY_MAX),
  category: z.enum(POST_CATEGORIES),
});

export type CreatePostFormValues = z.infer<typeof createPostSchema>;
