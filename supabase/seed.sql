-- supabase/seed.sql
-- Local development seed data.
-- Run automatically on: supabase db reset
-- Provides: 10 users, 50 posts (all full), ~150 comments, spice votes, blocks.
-- All UUIDs are deterministic so tests can reference them by ID.
--
-- IMPORTANT: this file uses service-role-level operations (direct inserts
-- into auth.users, overriding trigger-managed columns). Never run against
-- production.
--
-- STATE AFTER SEEDING
-- ───────────────────
-- Posts 1–50 (bulk):    participant_count = 4, is_full = true, status = 'active'
-- Post f01 (full):      participant_count = 4, is_full = true  (test fixture)
-- Posts f02–f04 (Iris): participant_count = 1, is_full = false (test fixture)
-- Users 001–008, 010:   active_post_count = 0  (all their posts are full)
-- User  009 (Iris):     active_post_count = 3  (her 3 not-yet-full posts)

-- ---------------------------------------------------------------------------
-- Disable all triggers that would interfere with bulk seed inserts.
-- Re-enabled at the bottom of this file.
-- ---------------------------------------------------------------------------

ALTER TABLE public.posts    DISABLE TRIGGER check_post_content_trg;
ALTER TABLE public.posts    DISABLE TRIGGER enforce_post_creation_limit_trg;
ALTER TABLE public.posts    DISABLE TRIGGER add_op_as_participant_trg;
ALTER TABLE public.comments DISABLE TRIGGER check_comment_content_trg;
ALTER TABLE public.comments DISABLE TRIGGER enforce_participation_limits_trg;

-- ---------------------------------------------------------------------------
-- Users (IDs: 00000000-0000-0000-0000-00000000000[1-a])
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  users uuid[] := ARRAY[
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000009',
    '00000000-0000-0000-0000-00000000000a'
  ]::uuid[];
  emails text[] := ARRAY[
    'alice@dev.akin.test',
    'bob@dev.akin.test',
    'carol@dev.akin.test',
    'dave@dev.akin.test',
    'eve@dev.akin.test',
    'frank@dev.akin.test',
    'grace@dev.akin.test',
    'henry@dev.akin.test',
    'iris@dev.akin.test',
    'jack@dev.akin.test'
  ];
  identifiers text[] := ARRAY[
    'CrimsonFox42',
    'CalmOtter17',
    'BrightWren88',
    'SteadyElk03',
    'GoldenSwift55',
    'KindLark21',
    'SilverBadger09',
    'QuietHeron34',
    'WarmBirch77',
    'TrueRaven61'
  ];
  i int;
BEGIN
  FOR i IN 1..10 LOOP
    -- Insert auth user
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
    ) VALUES (
      users[i], emails[i],
      crypt('Dev1234!', gen_salt('bf')),
      now() - (i || ' days')::interval,
      now() - (i || ' days')::interval,
      now() - (i || ' days')::interval,
      '{}', '{}', 'authenticated', 'authenticated'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Update the auto-created profile with real identifier + age verification.
    -- enforce_profile_update_columns_trg is disabled above so this is safe.
    UPDATE public.profiles
       SET anonymous_identifier = identifiers[i],
           age_verified_at      = now() - (i || ' days')::interval,
           onboarded_at         = now() - (i || ' days')::interval,
           language             = CASE WHEN i <= 6 THEN 'sv' ELSE 'en' END
     WHERE user_id = users[i];
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- Moderator role for user 1 (Alice / CrimsonFox42)
-- ---------------------------------------------------------------------------

INSERT INTO public.user_roles (user_id, role, granted_by)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'moderator',
  '00000000-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Posts — 50 full posts spread across categories, languages, authors
-- All are participant_count = 4 so they don't consume active_post_count slots.
-- ---------------------------------------------------------------------------

WITH seed_posts AS (
  SELECT
    gen_random_uuid()                                   AS id,
    (ARRAY[
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000003',
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000005',
      '00000000-0000-0000-0000-000000000006'
    ]::uuid[])[(n % 5) + 1]                             AS author_id,
    (ARRAY[
      'CalmOtter17','BrightWren88','SteadyElk03',
      'GoldenSwift55','KindLark21'
    ])[(n % 5) + 1]                                     AS author_identifier,
    'Dev post ' || n                                    AS title,
    'Development seed post number ' || n || '. This is placeholder content for local testing.' AS body,
    (ARRAY[
      'vent_space','all_the_feels','advice_needed','just_wondering',
      'story_time','decode_this','aitoo','hypothetically','good_vibes'
    ]::public.post_category[])[(n % 9) + 1]             AS category,
    (ARRAY['sv','sv','sv','en','en']::public.content_language[])[(n % 5) + 1] AS language,
    (now() - ((50 - n) || ' hours')::interval)          AS created_at
  FROM generate_series(1, 50) AS n
)
INSERT INTO public.posts (id, author_id, author_identifier, title, body, category, language,
                          participant_count, created_at, updated_at)
SELECT id, author_id, author_identifier, title, body, category, language,
       4,  -- pre-filled: 1 OP + 3 commenters below
       created_at, created_at
FROM seed_posts;

-- Post participants for bulk posts: OP + the 3 standard commenters.
-- Where OP is one of the commenter users (006), they still get one participant row.
INSERT INTO public.post_participants (post_id, user_id, joined_at)
SELECT p.id, p.author_id, p.created_at
FROM public.posts p
WHERE p.id NOT IN (
  '00000000-0000-0000-0000-000000000f01',
  '00000000-0000-0000-0000-000000000f02',
  '00000000-0000-0000-0000-000000000f03',
  '00000000-0000-0000-0000-000000000f04'
)
ON CONFLICT DO NOTHING;

-- Add the 3 standard commenters to each bulk post.
-- Uses DISTINCT ON to avoid duplicates when OP = one of the commenters.
INSERT INTO public.post_participants (post_id, user_id, joined_at)
SELECT DISTINCT p.id,
  commenter_id,
  p.created_at + interval '30 minutes'
FROM public.posts p
CROSS JOIN (
  VALUES
    ('00000000-0000-0000-0000-000000000006'::uuid),
    ('00000000-0000-0000-0000-000000000007'::uuid),
    ('00000000-0000-0000-0000-000000000008'::uuid)
) AS c(commenter_id)
WHERE p.id NOT IN (
  '00000000-0000-0000-0000-000000000f01',
  '00000000-0000-0000-0000-000000000f02',
  '00000000-0000-0000-0000-000000000f03',
  '00000000-0000-0000-0000-000000000f04'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Comments — ~3 comments per post (first 50 posts × 3 commenters = 150)
-- ---------------------------------------------------------------------------

INSERT INTO public.comments (post_id, author_id, author_identifier, body, created_at)
SELECT
  p.id AS post_id,
  (ARRAY[
    '00000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000008'
  ]::uuid[])[(row_number() OVER (PARTITION BY p.id ORDER BY p.id) % 3) + 1] AS author_id,
  (ARRAY['KindLark21','SilverBadger09','QuietHeron34'])
    [(row_number() OVER (PARTITION BY p.id ORDER BY p.id) % 3) + 1]          AS author_identifier,
  'Seed comment on post ' || row_number() OVER (PARTITION BY p.id ORDER BY p.id) AS body,
  p.created_at + interval '30 minutes'
FROM public.posts p
CROSS JOIN generate_series(1, 3) AS s(n)
WHERE p.status = 'active'
  AND p.id NOT IN (
    '00000000-0000-0000-0000-000000000f01',
    '00000000-0000-0000-0000-000000000f02',
    '00000000-0000-0000-0000-000000000f03',
    '00000000-0000-0000-0000-000000000f04'
  )
LIMIT 150;

-- ---------------------------------------------------------------------------
-- One fully full post (participant_count = 4) — useful for testing limits
-- ---------------------------------------------------------------------------

INSERT INTO public.posts (
  id, author_id, author_identifier, title, body, category,
  participant_count, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000f01',
  '00000000-0000-0000-0000-000000000002',
  'CalmOtter17',
  'This conversation is full',
  'Four people are already in this post. Useful for testing the full state.',
  'vent_space',
  4,
  now() - interval '2 hours',
  now() - interval '2 hours'
);

INSERT INTO public.post_participants (post_id, user_id, joined_at)
SELECT '00000000-0000-0000-0000-000000000f01', uid, now()
FROM unnest(ARRAY[
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005'
]::uuid[]) AS uid
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Three active posts for user 9 (Iris / WarmBirch77) — active_post_count = 3
-- These are NOT full so they consume Iris's active slots.
-- ---------------------------------------------------------------------------

INSERT INTO public.posts (id, author_id, author_identifier, title, body, category,
                          participant_count, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000f02',
   '00000000-0000-0000-0000-000000000009', 'WarmBirch77',
   'Iris active post 1', 'First active post body here for Iris.', 'advice_needed',
   1, now() - interval '1 hour', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-000000000f03',
   '00000000-0000-0000-0000-000000000009', 'WarmBirch77',
   'Iris active post 2', 'Second active post body here for Iris.', 'just_wondering',
   1, now() - interval '50 minutes', now() - interval '50 minutes'),
  ('00000000-0000-0000-0000-000000000f04',
   '00000000-0000-0000-0000-000000000009', 'WarmBirch77',
   'Iris active post 3', 'Third active post body here for Iris.', 'story_time',
   1, now() - interval '40 minutes', now() - interval '40 minutes');

INSERT INTO public.post_participants (post_id, user_id, joined_at)
VALUES
  ('00000000-0000-0000-0000-000000000f02', '00000000-0000-0000-0000-000000000009', now() - interval '1 hour'),
  ('00000000-0000-0000-0000-000000000f03', '00000000-0000-0000-0000-000000000009', now() - interval '50 minutes'),
  ('00000000-0000-0000-0000-000000000f04', '00000000-0000-0000-0000-000000000009', now() - interval '40 minutes')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Near-full E2E test fixture (f05): 3 of 4 slots taken (bob + carol + dave).
-- alice (001) is reserved as the 4th commenter in the comment-to-full E2E flow.
-- created_at is 30 seconds in the future so f05 sorts above all other seed posts
-- (including bulk posts seeded at now()) and appears at position 1 in the recent feed.
-- ---------------------------------------------------------------------------

INSERT INTO public.posts (
  id, author_id, author_identifier, title, body, category,
  participant_count, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000f05',
  '00000000-0000-0000-0000-000000000002', 'CalmOtter17',
  'Near-full E2E post',
  'This post has 3 of 4 participant slots filled. Used by the comment-to-full E2E flow.',
  'vent_space',
  3,
  now() + interval '30 seconds',
  now() + interval '30 seconds'
);

INSERT INTO public.post_participants (post_id, user_id, joined_at)
VALUES
  ('00000000-0000-0000-0000-000000000f05', '00000000-0000-0000-0000-000000000002', now() - interval '20 minutes'),
  ('00000000-0000-0000-0000-000000000f05', '00000000-0000-0000-0000-000000000003', now() - interval '15 minutes'),
  ('00000000-0000-0000-0000-000000000f05', '00000000-0000-0000-0000-000000000004', now() - interval '10 minutes')
ON CONFLICT DO NOTHING;

INSERT INTO public.comments (post_id, author_id, author_identifier, body, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000f05',
   '00000000-0000-0000-0000-000000000003', 'BrightWren88',
   'Same here, would be interested in hearing different perspectives.',
   now() - interval '15 minutes'),
  ('00000000-0000-0000-0000-000000000f05',
   '00000000-0000-0000-0000-000000000004', 'SteadyElk03',
   'I think it really depends on the situation honestly.',
   now() - interval '10 minutes');

-- triggers are disabled above, so comment_count won't auto-increment — patch it.
UPDATE public.posts SET comment_count = 2
 WHERE id = '00000000-0000-0000-0000-000000000f05';

-- ---------------------------------------------------------------------------
-- Manually set active_post_count to match the seed state.
-- All users have 0 active (non-full) posts except Iris (3) and f05 participants.
-- ---------------------------------------------------------------------------

UPDATE public.profiles SET active_post_count = 0;
UPDATE public.profiles SET active_post_count = 3
 WHERE user_id = '00000000-0000-0000-0000-000000000009';
-- bob (002), carol (003), dave (004) each have 1 active post from f05
UPDATE public.profiles SET active_post_count = 1
 WHERE user_id IN (
   '00000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000004'
 );

-- ---------------------------------------------------------------------------
-- Spice votes — a few votes on the first 10 active posts
-- ---------------------------------------------------------------------------

INSERT INTO public.spice_votes (post_id, user_id, score)
SELECT
  p.id,
  '00000000-0000-0000-0000-000000000007'::uuid,
  (random() * 4 + 1)::int
FROM public.posts p
WHERE p.author_id <> '00000000-0000-0000-0000-000000000007'
  AND p.status = 'active'
ORDER BY p.created_at
LIMIT 10
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- A block: Dave blocks Eve
-- ---------------------------------------------------------------------------

INSERT INTO public.blocks (blocker_id, blocked_id)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005'
)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Re-enable all triggers
-- ---------------------------------------------------------------------------

ALTER TABLE public.posts    ENABLE TRIGGER check_post_content_trg;
ALTER TABLE public.posts    ENABLE TRIGGER enforce_post_creation_limit_trg;
ALTER TABLE public.posts    ENABLE TRIGGER add_op_as_participant_trg;
ALTER TABLE public.comments ENABLE TRIGGER check_comment_content_trg;
ALTER TABLE public.comments ENABLE TRIGGER enforce_participation_limits_trg;
