// Scheduled purge Edge Function
// Invoked by pg_cron (configured in migration 0014) at 03:00 UTC daily.
// Hard-deletes auth.users rows for accounts soft-deleted > 30 days ago.
// The profiles rows are cleaned up via CASCADE from auth.users delete.
//
// This function requires the service-role key — it is never called from the client.
// CRITICAL-PATH: auth privacy — pending expert review

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req: Request) => {
  // Only allow internal invocations (pg_cron triggers via HTTP or direct invoke).
  // A shared secret prevents accidental external invocation.
  const authHeader = req.headers.get('Authorization');
  const expected = `Bearer ${Deno.env.get('SCHEDULED_PURGE_SECRET') ?? ''}`;
  if (authHeader !== expected) {
    return new Response('Forbidden', { status: 403 });
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch user_ids eligible for purge.
  const { data: rows, error: fetchError } = await supabaseAdmin
    .from('profiles')
    .select('user_id')
    .eq('status', 'deleted')
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff);

  if (fetchError) {
    console.error('purge-fetch-error', fetchError.message);
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ purged: 0 }), { status: 200 });
  }

  let purged = 0;
  const errors: string[] = [];

  for (const { user_id } of rows) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id as string);
    if (error) {
      errors.push(`${user_id as string}: ${error.message}`);
    } else {
      purged++;
    }
  }

  if (errors.length > 0) {
    console.error('purge-partial-errors', errors);
  }

  return new Response(JSON.stringify({ purged, errors }), { status: 200 });
});
