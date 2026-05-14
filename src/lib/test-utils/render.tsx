import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

// ThemeProvider, I18nProvider, and NavigationContainer wrappers will be added
// by the tasks that introduce them (theme tokens, i18n, expo-router test
// harness). For now the helper only wires TanStack Query.

const makeQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

type ProvidersProps = { children: ReactNode };

const Providers = ({ children }: ProvidersProps): ReactElement => {
  const queryClient = makeQueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: Providers, ...options });
