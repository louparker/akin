import '@testing-library/jest-native/extend-expect';

import { server } from '@/lib/test-utils/supabase-mock';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
