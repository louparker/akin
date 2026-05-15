import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement } from 'react';

// ThemeProvider, I18nProvider, NavigationContainer added here as they land in
// their respective phases. The QueryClientProvider is the only hard dependency now.

function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  const queryClient = makeTestQueryClient();

  function Wrapper({ children }: { children: ReactElement }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
}

// Re-export everything from RTL so tests import from one place.
export * from '@testing-library/react-native';
