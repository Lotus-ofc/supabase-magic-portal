import { QueryClient } from "@tanstack/react-query";

/** QueryClient compartilhado — defaults de performance para toda a app. */
export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
