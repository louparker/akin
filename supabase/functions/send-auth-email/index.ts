/**
 * send-auth-email — Supabase Auth "Send Email" Hook (Deno)
 *
 * Replaces Supabase's built-in auth email sender. Supabase Auth POSTs the
 * email payload to this function for every transactional auth email
 * (signup confirmation, password recovery, email change). The function
 * renders a bilingual, branded template and sends it via Resend so the
 * mail comes from ourakin.com and isn't subject to the built-in rate limit.
 *
 * Bilingual: language is read from user.user_metadata.language (set at
 * signup), defaulting to Swedish — honouring the bilingual-from-day-one rule.
 *
 * Security: the request is signed with Standard Webhooks. We verify the
 * signature with SEND_EMAIL_HOOK_SECRET before trusting any payload field.
 * Secrets: SEND_EMAIL_HOOK_SECRET, RESEND_API_KEY (set via `supabase secrets set`).
 *
 * Pure template/URL logic lives in ./templates.ts (unit-tested with Jest).
 *
 * CRITICAL-PATH: auth — pending human expert review before production.
 */

import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import {
  pickLanguage,
  buildConfirmationUrl,
  buildAuthEmail,
  type AuthActionType,
} from './templates.ts';

const FROM_ADDRESS = 'Akin <noreply@ourakin.com>';

interface HookPayload {
  user: { email: string; user_metadata?: { language?: string } };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

Deno.serve(async (req) => {
  try {
    const rawSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
    if (!rawSecret) {
      console.error('send-auth-email: SEND_EMAIL_HOOK_SECRET not set');
      return errorResponse(500, 'hook_not_configured');
    }

    const payloadStr = await req.text();
    const headers = Object.fromEntries(req.headers);

    // Verify the Standard Webhooks signature. Supabase issues the secret with a
    // "v1,whsec_" prefix; the library wants the base64 portion.
    const wh = new Webhook(rawSecret.replace('v1,whsec_', ''));
    let payload: HookPayload;
    try {
      payload = wh.verify(payloadStr, headers) as HookPayload;
    } catch {
      console.error('send-auth-email: signature verification failed');
      return errorResponse(401, 'invalid_signature');
    }

    const { user, email_data } = payload;
    const lang = pickLanguage(user.user_metadata);
    const confirmationUrl = buildConfirmationUrl(email_data);
    const email = buildAuthEmail({
      actionType: email_data.email_action_type as AuthActionType,
      lang,
      confirmationUrl,
      token: email_data.token,
    });

    await sendEmail(user.email, email.subject, email.html);

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('send-auth-email error:', err);
    return errorResponse(500, 'internal_error');
  }
});

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}

// Supabase Auth expects hook errors in this envelope so it can surface a
// meaningful message and decide whether to fall back.
function errorResponse(httpCode: number, message: string): Response {
  return new Response(JSON.stringify({ error: { http_code: httpCode, message } }), {
    status: httpCode,
    headers: { 'Content-Type': 'application/json' },
  });
}
