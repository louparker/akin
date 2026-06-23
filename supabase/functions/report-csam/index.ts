/**
 * report-csam — Supabase Edge Function (Deno)
 *
 * Called immediately after the moderator confirms a CSAM action.
 * The DB function (0020/0023) has already banned the account and hidden
 * the content by the time this function is invoked.
 *
 * This function:
 *   1. Reads the content + audit metadata from the DB.
 *   2. Writes a structured evidence export to the private `csam-reports`
 *      Storage bucket (one JSON file per case, never deleted automatically).
 *   3. Emails the founder with a case reference so manual ECPAT/NCMEC
 *      submission can be completed within the required SLA.
 *
 * v1 deferral: direct ECPAT Sweden / NCMEC API submission is deferred to
 * pre-launch (Phase 8.9). The export file is structured to match NCMEC
 * CyberTipline format to make that integration mechanical.
 * See: docs/csam-compliance.md for the pre-launch checklist.
 *
 * Request body: { reportId: string }
 * Response 200: { exported: boolean, caseRef?: string, reason?: string }
 *
 * Security: caller must be authenticated as a moderator. Service-role used
 * internally to read auth.users and write to private Storage.
 * Secrets: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY, FOUNDER_EMAIL.
 *
 * CRITICAL-PATH: CSAM / moderation — mandatory human expert review and
 * ECPAT/NCMEC engagement before production launch. See docs/csam-compliance.md.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = 'csam-reports';
const FROM_ADDRESS = 'Akin Safety <safety@ourakin.com>';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ exported: false, reason: 'unauthorized' }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify moderator.
    const { data: callerData } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    );
    if (!callerData?.user) return json({ exported: false, reason: 'unauthorized' }, 401);

    const { data: role } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerData.user.id)
      .in('role', ['moderator', 'admin'])
      .maybeSingle();

    if (!role) return json({ exported: false, reason: 'forbidden' }, 403);

    const { reportId } = (await req.json()) as { reportId?: string };
    if (!reportId) return json({ exported: false, reason: 'missing_report_id' }, 400);

    // Fetch the report.
    const { data: report, error: reportError } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .single();
    if (reportError || !report) return json({ exported: false, reason: 'report_not_found' }, 200);

    // Fetch the CSAM audit log entry written by moderate_report().
    const { data: auditRow } = await supabaseAdmin
      .from('audit_log')
      .select('*')
      .eq('target_type', 'user')
      .contains('metadata', { csam: true })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fetch content details.
    const content = await resolveContent(supabaseAdmin, report.target_type, report.target_id);

    // Resolve target user for the export.
    const targetUserId = auditRow?.target_id ?? content?.authorId ?? null;
    let accountCreatedAt: string | null = null;
    if (targetUserId) {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
      accountCreatedAt = authUser?.user?.created_at ?? null;
    }

    // Build the structured NCMEC CyberTipline-compatible export.
    const caseRef = `CSAM-${Date.now()}-${reportId.slice(0, 8).toUpperCase()}`;
    const exportPayload = {
      caseRef,
      reportedAt: new Date().toISOString(),
      reportId,
      incidentType: 'CSAM',
      platformName: 'Akin',
      platformUrl: 'https://ourakin.com',
      reporterType: 'ESP', // Electronic Service Provider
      // Content details (preserved for legal retention, never deleted < 90 days)
      content: {
        type: report.target_type,
        id: report.target_id,
        body: content?.body ?? null,
        createdAt: content?.createdAt ?? null,
      },
      // Account details
      account: {
        internalId: targetUserId,
        createdAt: accountCreatedAt,
        // Note: email withheld here — include only when submitting to NCMEC
        // to minimise PII in the export file itself.
      },
      // Moderator action record
      auditLogId: auditRow?.id ?? null,
      moderatorId: callerData.user.id,
      // Deferral note: ECPAT/NCMEC submission is manual for v1.
      // See docs/csam-compliance.md §3 for the submission checklist.
      ncmecSubmittedAt: null,
      ecpatSubmittedAt: null,
    };

    // Write to private Storage bucket.
    const filePath = `${caseRef}.json`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(filePath, JSON.stringify(exportPayload, null, 2), {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      console.error('report-csam: Storage upload failed:', uploadError);
      // Still email the founder even if Storage fails — the audit log is the fallback.
      await notifyFounder(caseRef, reportId, null, false);
      return json({ exported: false, caseRef, reason: 'storage_upload_failed' }, 200);
    }

    await notifyFounder(caseRef, reportId, filePath, true);

    return json({ exported: true, caseRef }, 200);
  } catch (err) {
    console.error('report-csam error:', err);
    return json({ exported: false, reason: 'internal_error' }, 500);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

interface ContentDetails {
  body: string | null;
  createdAt: string | null;
  authorId: string | null;
}

async function resolveContent(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  targetType: string,
  targetId: string,
): Promise<ContentDetails | null> {
  if (targetType === 'post') {
    const { data } = await supabase
      .from('posts')
      .select('body, created_at, author_id')
      .eq('id', targetId)
      .single();
    return data ? { body: data.body, createdAt: data.created_at, authorId: data.author_id } : null;
  }
  if (targetType === 'comment') {
    const { data } = await supabase
      .from('comments')
      .select('body, created_at, author_id')
      .eq('id', targetId)
      .single();
    return data ? { body: data.body, createdAt: data.created_at, authorId: data.author_id } : null;
  }
  return null;
}

async function notifyFounder(
  caseRef: string,
  reportId: string,
  filePath: string | null,
  exported: boolean,
): Promise<void> {
  const founderEmail = Deno.env.get('FOUNDER_EMAIL');
  if (!founderEmail) {
    console.warn('report-csam: FOUNDER_EMAIL not set — skipping founder notification');
    return;
  }

  const resendKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const storageNote =
    exported && filePath
      ? `<p>Evidence export: <code>csam-reports/${filePath}</code></p>`
      : `<p><strong>⚠ Storage upload failed.</strong> Refer to audit_log for evidence (query: metadata-&gt;&gt;'csam' = 'true').</p>`;

  const html = `
    <h2>CSAM Report — Immediate Action Required</h2>
    <p><strong>Case reference:</strong> ${caseRef}</p>
    <p><strong>Internal report ID:</strong> ${reportId}</p>
    ${storageNote}
    <p>Action taken: account permanently banned, content hidden.</p>
    <hr>
    <p>Manual steps required within 24 hours:</p>
    <ol>
      <li>Review the evidence export in Supabase Storage (<code>csam-reports</code> bucket).</li>
      <li>Submit to ECPAT Sweden: <a href="https://ecpat.org/report/">ecpat.org/report</a></li>
      <li>Submit to NCMEC CyberTipline: <a href="https://www.missingkids.org/gethelpnow/cybertipline">missingkids.org CyberTipline</a></li>
      <li>Record submission references in the audit log (update metadata on audit row).</li>
      <li>Follow up with local law enforcement if credible threat identified.</li>
    </ol>
    <p>See <code>docs/csam-compliance.md</code> for the full compliance checklist.</p>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: founderEmail,
      subject: `[URGENT] CSAM report — ${caseRef}`,
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`report-csam: Resend error ${res.status}: ${body}`);
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
