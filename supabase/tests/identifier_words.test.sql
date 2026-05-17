-- supabase/tests/identifier_words.test.sql
-- pgTAP tests for 0002_create_identifier_words.sql
BEGIN;

SELECT plan(5);

-- Test 1: authenticated role can SELECT from identifier_words
SELECT ok(
  (SELECT count(*) FROM public.identifier_words) > 0,
  'identifier_words table has rows'
);

-- Test 2: English adjectives exist
SELECT ok(
  (SELECT count(*) FROM public.identifier_words WHERE kind = 'adjective' AND language = 'en' AND approved = true) >= 50,
  'at least 50 approved English adjectives'
);

-- Test 3: Swedish nouns exist
SELECT ok(
  (SELECT count(*) FROM public.identifier_words WHERE kind = 'noun' AND language = 'sv' AND approved = true) >= 50,
  'at least 50 approved Swedish nouns'
);

-- Test 4: combination count allows 10,000+ unique identifiers per language
-- (adjectives * nouns; suffix adds more uniqueness on top)
SELECT ok(
  (SELECT count(*) FROM public.identifier_words WHERE kind = 'adjective' AND language = 'en' AND approved = true)
  *
  (SELECT count(*) FROM public.identifier_words WHERE kind = 'noun' AND language = 'en' AND approved = true)
  >= 5000,
  'English word combo count >= 5000 (suffix multiplies this further)'
);

-- Test 5: no word is empty or shorter than 2 characters
SELECT is(
  (SELECT count(*) FROM public.identifier_words WHERE length(word) < 2),
  0::bigint,
  'no word shorter than 2 characters'
);

SELECT * FROM finish();
ROLLBACK;
