import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Baseline handlers — individual tests can override via server.use(...)
const handlers = [
  http.get('https://*.supabase.co/rest/v1/*', () => HttpResponse.json([])),
  http.post('https://*.supabase.co/rest/v1/*', () => HttpResponse.json([], { status: 201 })),
];

export const supabaseServer = setupServer(...handlers);
