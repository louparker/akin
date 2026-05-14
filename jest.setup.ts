// RTL 13+ auto-loads its matchers when any RTL import runs — no extend-expect needed.
import { supabaseServer } from '@/lib/test-utils/supabase-mock';

beforeAll(() =>
  supabaseServer.listen({
    // Warn (not error) on unhandled requests — catches gaps in mocking without
    // failing unrelated tests.
    onUnhandledRequest: 'warn',
  }),
);

afterEach(() => supabaseServer.resetHandlers());

afterAll(() => supabaseServer.close());
