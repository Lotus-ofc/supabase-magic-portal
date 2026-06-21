import { useEffect } from "react";
import { useBlocker } from "@tanstack/react-router";

/**
 * Blocks router navigation + tab close while `when` is true.
 * Uses TanStack Router's useBlocker so it integrates with Link clicks.
 */
export function useDirtyBlocker(when: boolean, message = "Você tem alterações não salvas. Sair mesmo assim?") {
  useBlocker({
    shouldBlockFn: () => {
      if (!when) return false;
      return !window.confirm(message);
    },
    enableBeforeUnload: when,
  });

  // Belt-and-suspenders: also wire beforeunload for hard reloads.
  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when]);
}
