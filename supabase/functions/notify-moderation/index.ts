/**
 * notify-moderation — Supabase Edge Function (Deno)
 *
 * Sends a transactional email to an affected user after a moderation action.
 * Only called for warn / suspend / ban — not for dismiss, hide, or csam.
 *
 * The CSAM path has its own `report-csam` function.
 * Email is best-effort: a failure here never rolls back the moderation action.
 *
 * Request body: { reportId: string, action: 'warn' | 'suspend' | 'ban' }
 * Response 200: { sent: boolean, reason?: string }
 *
 * Security: caller must be authenticated as a moderator (verified via user_roles).
 * Secrets: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY (set via `supabase secrets set`).
 *
 * CRITICAL-PATH: moderation — pending human expert review before production.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const NOTIFIABLE_ACTIONS = new Set(['warn', 'suspend', 'ban']);
const FROM_ADDRESS = 'Akin <noreply@ourakin.com>';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ sent: false, reason: 'unauthorized' }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify caller is a moderator.
    const { data: callerData } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (!callerData?.user) return json({ sent: false, reason: 'unauthorized' }, 401);

    const { data: role } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerData.user.id)
      .in('role', ['moderator', 'admin'])
      .maybeSingle();

    if (!role) return json({ sent: false, reason: 'forbidden' }, 403);

    const { reportId, action } = (await req.json()) as { reportId?: string; action?: string };

    if (!reportId || !action) return json({ sent: false, reason: 'missing_params' }, 400);
    if (!NOTIFIABLE_ACTIONS.has(action)) {
      return json({ sent: false, reason: 'action_not_notifiable' }, 200);
    }

    // Resolve target user from the report.
    const { data: report } = await supabaseAdmin
      .from('reports')
      .select('target_type, target_id')
      .eq('id', reportId)
      .single();
    if (!report) return json({ sent: false, reason: 'report_not_found' }, 200);

    const targetUserId = await resolveTargetUserId(
      supabaseAdmin,
      report.target_type,
      report.target_id,
    );
    if (!targetUserId) return json({ sent: false, reason: 'no_target_user' }, 200);

    // Fetch user email (requires service role) and profile language.
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(targetUserId),
      supabaseAdmin
        .from('profiles')
        .select('language, suspended_until')
        .eq('user_id', targetUserId)
        .single(),
    ]);

    const email = authUser?.user?.email;
    if (!email) return json({ sent: false, reason: 'no_email' }, 200);

    const lang = (profile?.language ?? 'sv') as 'sv' | 'en';
    const suspendedUntil = profile?.suspended_until ?? null;

    const template = buildTemplate(action, lang, suspendedUntil);

    await sendEmail(email, template.subject, template.html);

    return json({ sent: true }, 200);
  } catch (err) {
    console.error('notify-moderation error:', err);
    return json({ sent: false, reason: 'internal_error' }, 500);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

async function resolveTargetUserId(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  targetType: string,
  targetId: string,
): Promise<string | null> {
  if (targetType === 'post') {
    const { data } = await supabase.from('posts').select('author_id').eq('id', targetId).single();
    return data?.author_id ?? null;
  }
  if (targetType === 'comment') {
    const { data } = await supabase
      .from('comments')
      .select('author_id')
      .eq('id', targetId)
      .single();
    return data?.author_id ?? null;
  }
  if (targetType === 'user') return targetId;
  return null;
}

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

interface EmailTemplate {
  subject: string;
  html: string;
}

function buildTemplate(
  action: string,
  lang: 'sv' | 'en',
  suspendedUntil: string | null,
): EmailTemplate {
  const suspendDate = suspendedUntil
    ? new Date(suspendedUntil).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  if (lang === 'sv') {
    // TODO i18n review: Swedish email copy, needs native review + legal sign-off before launch
    if (action === 'warn') {
      return {
        subject: 'Akin — du har fått en varning',
        html: `
          <p>Ditt konto har fått en varning på grund av innehåll som bröt mot Akins riktlinjer.</p>
          <p>Du kan fortsätta använda appen, men ytterligare överträdelser kan leda till
          tillfällig eller permanent avstängning.</p>
          <p>Om du har frågor, kontakta oss på <a href="mailto:info@ourakin.com">info@ourakin.com</a>.</p>
        `,
      };
    }
    if (action === 'suspend') {
      return {
        subject: 'Akin — ditt konto är tillfälligt avstängt',
        html: `
          <p>Ditt konto är tillfälligt avstängt${suspendDate ? ` till och med ${suspendDate}` : ' i 7 dagar'} på grund av upprepade brott mot Akins riktlinjer.</p>
          <p>Du kan logga in igen efter att stängningstiden har löpt ut. Ytterligare brott
          kan leda till permanent bannlysning.</p>
          <p>Om du har frågor, kontakta oss på <a href="mailto:info@ourakin.com">info@ourakin.com</a>.</p>
        `,
      };
    }
    return {
      subject: 'Akin — ditt konto har bannlysts permanent',
      html: `
        <p>Ditt konto har permanent bannlysts från Akin på grund av allvarliga eller upprepade brott mot våra riktlinjer.</p>
        <p>Du kan fortfarande logga in för att ladda ner din data i enlighet med GDPR.</p>
        <p>Om du anser att detta beslut har tagits av misstag, kontakta oss på <a href="mailto:info@ourakin.com">info@ourakin.com</a>.</p>
      `,
    };
  }

  // English templates
  if (action === 'warn') {
    return {
      subject: 'Akin — you have received a warning',
      html: `
        <p>Your account has received a warning due to content that violated Akin's community guidelines.</p>
        <p>You can continue using the app, but further violations may result in a temporary
        suspension or permanent ban.</p>
        <p>If you have questions, contact us at <a href="mailto:info@ourakin.com">info@ourakin.com</a>.</p>
      `,
    };
  }
  if (action === 'suspend') {
    return {
      subject: 'Akin — your account has been temporarily suspended',
      html: `
        <p>Your account has been suspended${suspendDate ? ` until ${suspendDate}` : ' for 7 days'} due to repeated violations of Akin's community guidelines.</p>
        <p>You can log in again once the suspension period ends. Further violations may
        result in a permanent ban.</p>
        <p>If you have questions, contact us at <a href="mailto:info@ourakin.com">info@ourakin.com</a>.</p>
      `,
    };
  }
  return {
    subject: 'Akin — your account has been permanently banned',
    html: `
      <p>Your account has been permanently banned from Akin due to serious or repeated violations of our community guidelines.</p>
      <p>You can still log in to download your data in accordance with GDPR.</p>
      <p>If you believe this decision was made in error, contact us at <a href="mailto:info@ourakin.com">info@ourakin.com</a>.</p>
    `,
  };
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
