import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";
import { tutorialBasePath, type TutorialAudience } from "@/lib/platform-tutorial";

export function useTutorialCurrentSlug(audience: TutorialAudience): string | undefined {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return useMemo(() => {
    const prefix = `${tutorialBasePath(audience)}/`;
    if (!pathname.startsWith(prefix)) return undefined;
    const rest = pathname.slice(prefix.length).replace(/^\/+|\/+$/g, "");
    if (!rest) return undefined;
    return `${audience}/${rest}`;
  }, [pathname, audience]);
}
