import { useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { recordAudit } from "@/lib/audit-log";

export function useSignOut(userEmail?: string | null) {
  const router = useRouter();

  return useCallback(async () => {
    recordAudit({
      action: "logout",
      detail: "Sessão encerrada pelo usuário",
      userEmail: userEmail ?? undefined,
    });
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }, [router, userEmail]);
}
