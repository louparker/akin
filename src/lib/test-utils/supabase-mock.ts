import { rest } from 'msw';
import { setupServer } from 'msw/node';

// Baseline handlers — individual tests can override via server.use(...)
const handlers = [
  rest.get('https://*.supabase.co/rest/v1/*', (_req, res, ctx) =>
    res(ctx.json([])),
  ),
  rest.post('https://*.supabase.co/rest/v1/*', (_req, res, ctx) =>
    res(ctx.status(201), ctx.json([])),
  ),
];

export const supabaseServer = setupServer(...handlers);
