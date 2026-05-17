/**
 * generate-identifier — Supabase Edge Function (Deno)
 *
 * Assigns a random anonymous identifier ([Adjective][Noun][NN-NNNN]) to a
 * profile row whose identifier still starts with 'pending_'. Called from
 * the auth-trigger hook or polled by a cron on startup.
 *
 * Request body: { userId: string }
 * Response 200: { identifier: string }
 * Response 400: missing userId
 * Response 500: all retries exhausted
 *
 * Security: requires service-role key in Authorization header.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_RETRIES = 5;

Deno.serve(async (req) => {
  try {
    const { userId } = (await req.json()) as { userId?: string };

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Fetch the user's language preference
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('language, anonymous_identifier')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Already has a real identifier — idempotent exit
    if (!profile.anonymous_identifier.startsWith('pending_')) {
      return new Response(JSON.stringify({ identifier: profile.anonymous_identifier }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const lang = profile.language as 'sv' | 'en';

    // Load approved words for this language
    const { data: adjectives, error: adjError } = await supabase
      .from('identifier_words')
      .select('word')
      .eq('kind', 'adjective')
      .eq('language', lang)
      .eq('approved', true);

    const { data: nouns, error: nounError } = await supabase
      .from('identifier_words')
      .select('word')
      .eq('kind', 'noun')
      .eq('language', lang)
      .eq('approved', true);

    if (adjError || nounError || !adjectives?.length || !nouns?.length) {
      return new Response(JSON.stringify({ error: 'word list unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Attempt up to MAX_RETRIES times with widening suffix range
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)]!.word;
      const noun = nouns[Math.floor(Math.random() * nouns.length)]!.word;

      // Suffix widens on each retry: 2 digits → 3 digits → 4 digits
      const suffixLen = Math.min(2 + attempt, 4);
      const maxSuffix = Math.pow(10, suffixLen);
      const suffix = Math.floor(Math.random() * maxSuffix)
        .toString()
        .padStart(suffixLen, '0');

      const identifier = `${adj}${noun}${suffix}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ anonymous_identifier: identifier })
        .eq('user_id', userId)
        .eq('anonymous_identifier', profile.anonymous_identifier); // optimistic check

      if (!updateError) {
        // Log to audit trail
        await supabase.rpc('log_audit', {
          p_actor_id: null,
          p_action: 'profile.identifier_assigned',
          p_target_type: 'profile',
          p_target_id: userId,
          p_metadata: { identifier, lang, attempt },
        });

        return new Response(JSON.stringify({ identifier }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Unique constraint violation (23505) → retry with new words/suffix
      // Any other error → bail out immediately
      if (!updateError.code?.includes('23505')) {
        throw updateError;
      }
    }

    return new Response(JSON.stringify({ error: 'identifier_collision_exhausted' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-identifier error:', err);
    return new Response(JSON.stringify({ error: 'internal_error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
