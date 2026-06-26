/**
 * notify-comment — Supabase Edge Function (Deno)
 *
 * Sends a generic push notification when a new active comment is created.
 * The lock-screen copy intentionally excludes post title, comment body, and
 * anonymous identifier to avoid leaking sensitive conversation content.
 *
 * Request body: { commentId: string }
 * Response 200: { sent: number, reason?: string }
 *
 * Security: caller must be the comment author. Delivery uses service-role
 * reads server-side, then respects user opt-in preferences and block rows.
 * Secrets: SUPABASE_SERVICE_ROLE_KEY.
 *
 * CRITICAL-PATH: notifications + privacy — pending human expert review before production.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ sent: 0, reason: 'unauthorized' }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: callerData } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (!callerData?.user) return json({ sent: 0, reason: 'unauthorized' }, 401);

    const { commentId } = (await req.json()) as { commentId?: string };
    if (!commentId) return json({ sent: 0, reason: 'missing_comment_id' }, 400);

    const { data: comment } = await supabaseAdmin
      .from('comments')
      .select('id, post_id, author_id, status, removed_by_op')
      .eq('id', commentId)
      .single();

    if (!comment) return json({ sent: 0, reason: 'comment_not_found' }, 200);
    if (comment.author_id !== callerData.user.id) {
      return json({ sent: 0, reason: 'forbidden' }, 403);
    }
    if (comment.status !== 'active' || comment.removed_by_op) {
      return json({ sent: 0, reason: 'comment_not_notifiable' }, 200);
    }

    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('id, status')
      .eq('id', comment.post_id)
      .single();
    if (!post || post.status !== 'active') return json({ sent: 0, reason: 'post_inactive' }, 200);

    const { data: participants } = await supabaseAdmin
      .from('post_participants')
      .select('user_id')
      .eq('post_id', comment.post_id);

    const recipientIds = (participants ?? [])
      .map((p: { user_id: string }) => p.user_id)
      .filter((userId: string) => userId !== comment.author_id);

    if (recipientIds.length === 0) return json({ sent: 0, reason: 'no_recipients' }, 200);

    const { data: blockRows } = await supabaseAdmin
      .from('blocks')
      .select('blocker_id, blocked_id')
      .or(`blocker_id.eq.${comment.author_id},blocked_id.eq.${comment.author_id}`);

    const blockedRecipientIds = new Set(
      (blockRows ?? [])
        .map((row: { blocker_id: string; blocked_id: string }) =>
          row.blocker_id === comment.author_id ? row.blocked_id : row.blocker_id,
        )
        .filter((userId: string) => recipientIds.includes(userId)),
    );

    const unblockedRecipientIds = recipientIds.filter((userId) => !blockedRecipientIds.has(userId));
    if (unblockedRecipientIds.length === 0) {
      return json({ sent: 0, reason: 'all_recipients_blocked' }, 200);
    }

    const { data: preferences } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id')
      .eq('push_replies', true)
      .in('user_id', unblockedRecipientIds);

    const optedInIds = (preferences ?? []).map((pref: { user_id: string }) => pref.user_id);
    if (optedInIds.length === 0) return json({ sent: 0, reason: 'no_opted_in_recipients' }, 200);

    const [{ data: tokens }, { data: profiles }] = await Promise.all([
      supabaseAdmin
        .from('push_tokens')
        .select('id, user_id, expo_push_token')
        .eq('enabled', true)
        .in('user_id', optedInIds),
      supabaseAdmin.from('profiles').select('user_id, language').in('user_id', optedInIds),
    ]);

    if (!tokens || tokens.length === 0) return json({ sent: 0, reason: 'no_tokens' }, 200);

    const languageByUser = new Map(
      (profiles ?? []).map((profile: { user_id: string; language: string | null }) => [
        profile.user_id,
        profile.language === 'en' ? 'en' : 'sv',
      ]),
    );

    const messages = tokens.map((token: { id: string; user_id: string; expo_push_token: string }) =>
      buildMessage(
        token.expo_push_token,
        languageByUser.get(token.user_id) ?? 'sv',
        comment.post_id,
      ),
    );

    const invalidTokens = await sendExpoPush(messages, tokens);
    if (invalidTokens.length > 0) {
      await supabaseAdmin.from('push_tokens').update({ enabled: false }).in('id', invalidTokens);
    }

    return json({ sent: messages.length }, 200);
  } catch (err) {
    console.error('notify-comment error:', err);
    return json({ sent: 0, reason: 'internal_error' }, 500);
  }
});

function buildMessage(to: string, lang: 'sv' | 'en', postId: string) {
  // TODO i18n review: Swedish push copy needs native review before launch.
  const copy =
    lang === 'en'
      ? {
          title: 'New reply in Akin',
          body: "A conversation you're in has a new reply.",
        }
      : {
          title: 'Nytt svar i Akin',
          body: 'En konversation du är med i har fått ett nytt svar.',
        };

  return {
    to,
    sound: 'default',
    title: copy.title,
    body: copy.body,
    data: {
      type: 'comment_reply',
      postId,
      url: `/(main)/post/${postId}`,
    },
  };
}

async function sendExpoPush(
  messages: Array<ReturnType<typeof buildMessage>>,
  tokens: Array<{ id: string }>,
): Promise<string[]> {
  const res = await fetch(EXPO_PUSH_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Expo push error ${res.status}: ${body}`);
  }

  const payload = (await res.json()) as {
    data?: Array<{ status: string; details?: { error?: string } }>;
  };

  return (payload.data ?? [])
    .map((ticket, index) =>
      ticket.details?.error === 'DeviceNotRegistered' ? tokens[index]?.id : null,
    )
    .filter((id): id is string => typeof id === 'string');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
