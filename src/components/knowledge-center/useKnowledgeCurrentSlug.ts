import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";

export function useKnowledgeCurrentSlug(): string | undefined {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return useMemo(() => {
    const prefix = "/admin/knowledge/";
    if (!pathname.startsWith(prefix)) return undefined;
    const rest = pathname.slice(prefix.length);
    return rest || undefined;
  }, [pathname]);
}
