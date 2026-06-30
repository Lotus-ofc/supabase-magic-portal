import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildProfileForUserId } from "@/modules/access/internal/access-db.server";

export const assertAccessActive = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const profile = await buildProfileForUserId(context.userId);
      if (profile.can_access_platform) {
        return {
          ok: true,
          lifecycle_status: profile.lifecycle_status,
          effective_status: profile.effective_status,
        };
      }

      return {
        ok: false,
        lifecycle_status: profile.lifecycle_status,
        effective_status: profile.effective_status,
      };
    } catch {
      return { ok: true, lifecycle_status: "active", effective_status: "active", legacy: true };
    }
  });
