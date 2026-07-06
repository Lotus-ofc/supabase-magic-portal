/** Raiz de invalidação cross-module para TanStack Query. */
export const osKeys = {
  all: ["os"] as const,
  search: (query: string) => [...osKeys.all, "search", query] as const,
  notifications: (userId?: string) => [...osKeys.all, "notifications", userId] as const,
  audit: () => [...osKeys.all, "audit"] as const,
};
