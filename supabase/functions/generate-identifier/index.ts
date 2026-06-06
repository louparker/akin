/**
 * generate-identifier — Supabase Edge Function (Deno)
 *
 * Assigns (or regenerates) a random anonymous identifier
 * ([Adjective][Noun][NN-NNNN]) on a profile row.
 *
 * Two modes:
 *   • { userId } — default. Idempotent: returns the existing identifier if it
 *     is already real (not 'pending_*'). Used by the post-signup poll.
 *   • { userId, force: true } — bypasses idempotency to issue a NEW identifier.
 *     Used by the "Try another name" button on the identifier reveal screen.
 *     Only allowed while the profile is still pre-onboarding
 *     (profiles.onboarded_at IS NULL). After onboarding, the identifier is
 *     locked and any force=true call returns 403.
 *
 * Response 200: { identifier: string }
 * Response 400: missing userId
 * Response 403: force=true after onboarding (identifier locked)
 * Response 404: profile not found
 * Response 500: all retries exhausted / internal error
 *
 * Security: requires service-role key in Authorization header.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const MAX_RETRIES = 5;

Deno.serve(async (req) => {
  try {
    const { userId, force } = (await req.json()) as { userId?: string; force?: boolean };

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

    // Fetch the user's language preference + onboarding state
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('language, anonymous_identifier, onboarded_at')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hasRealIdentifier = !profile.anonymous_identifier.startsWith('pending_');

    // Idempotent exit for the default (poll) path: identifier is already set
    // and the caller didn't ask to regenerate. Return the current value.
    if (hasRealIdentifier && !force) {
      return new Response(JSON.stringify({ identifier: profile.anonymous_identifier }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Regeneration safety gate: once onboarding is complete, the identifier is
    // locked. Trying to force a new one is a 403, not a silent no-op.
    if (force && profile.onboarded_at !== null) {
      return new Response(JSON.stringify({ error: 'identifier_locked' }), {
        status: 403,
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
        // Audit trail — distinguish first-time assignment from explicit regeneration
        await supabase.rpc('log_audit', {
          p_actor_id: null,
          p_action: force ? 'profile.identifier_regenerated' : 'profile.identifier_assigned',
          p_target_type: 'profile',
          p_target_id: userId,
          p_metadata: {
            identifier,
            lang,
            attempt,
            previous_identifier: profile.anonymous_identifier,
          },
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
