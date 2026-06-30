import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import type { AccessLifecycleStatus } from "@/features/access";
import {
  ACCESS_RECOVERY_ACTIONS,
  type AccessRecoveryAction,
} from "@/modules/access/recovery-actions";
import {
  assertAdminAccess,
  invalidateAllSessions,
  recordAccessAuditEntry,
  upsertLifecycle,
} from "@/modules/access/internal/access-db.server";

export type { AccessRecoveryAction } from "@/modules/access/recovery-actions";

export const performAccessRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        action: z.enum(ACCESS_RECOVERY_ACTIONS),
        client_origin: z.string().url().optional().nullable(),
        blocked_reason: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context);
    const admin = getSupabaseAdmin();
    const { data: userData, error: userError } = await admin.auth.admin.getUserById(data.user_id);
    if (userError) throw new Error(userError.message);
    const authUser = userData.user;
    if (!authUser?.email) throw new Error("Usuário sem e-mail.");

    const action = data.action as AccessRecoveryAction;

    switch (action) {
      case "resend_invite": {
        await invalidateAllSessions(data.user_id);
        const { resendAuthInviteEmail } = await import("@/modules/admin/invites.server");
        await resendAuthInviteEmail(
          admin,
          authUser.email,
          data.user_id,
          { full_name: (authUser.user_metadata?.full_name as string | undefined) ?? null },
          data.client_origin,
        );
        await upsertLifecycle(data.user_id, "invite_pending");
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "invite_resent",
          detail: "Sessões anteriores invalidadas; novo convite enviado.",
        });
        return { ok: true as const };
      }
      case "delete_user": {
        await invalidateAllSessions(data.user_id);
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "user_deleted",
        });
        await Promise.all([
          admin.from("access_accounts").delete().eq("user_id", data.user_id),
          admin.from("client_access").delete().eq("user_id", data.user_id),
          admin.from("user_roles").delete().eq("user_id", data.user_id),
          admin.from("profiles").delete().eq("id", data.user_id),
        ]);
        const { error: deleteError } = await admin.auth.admin.deleteUser(data.user_id);
        if (deleteError) throw new Error(deleteError.message);
        return { ok: true as const, deleted: true };
      }
      case "invalidate_sessions": {
        await invalidateAllSessions(data.user_id);
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "sessions_revoked",
        });
        return { ok: true as const };
      }
      case "force_password_reset": {
        await invalidateAllSessions(data.user_id);
        const { sendPasswordResetEmail } = await import("@/modules/admin/invites.server");
        await sendPasswordResetEmail(authUser.email, data.client_origin);
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "password_reset_requested",
          detail: "E-mail de recovery enviado via Supabase Auth.",
        });
        return { ok: true as const };
      }
      case "revoke": {
        await admin.auth.admin.updateUserById(data.user_id, { ban_duration: "876600h" });
        await invalidateAllSessions(data.user_id);
        await upsertLifecycle(
          data.user_id,
          "revoked",
          data.blocked_reason ?? "Revogado pelo admin",
        );
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "access_revoked",
          detail: data.blocked_reason ?? undefined,
        });
        return { ok: true as const };
      }
      case "disable": {
        await invalidateAllSessions(data.user_id);
        await upsertLifecycle(
          data.user_id,
          "disabled",
          data.blocked_reason ?? "Desativado pelo admin",
        );
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "access_disabled",
          detail: data.blocked_reason ?? undefined,
        });
        return { ok: true as const };
      }
      case "reactivate": {
        await admin.auth.admin.updateUserById(data.user_id, { ban_duration: "none" });
        const { isOnboardingComplete, parseLotsBiMetadata } =
          await import("@/features/access/lots-bi-metadata");
        const lotsBi = parseLotsBiMetadata(authUser.user_metadata);
        const next: AccessLifecycleStatus = isOnboardingComplete(lotsBi)
          ? "active"
          : "awaiting_password";
        await upsertLifecycle(data.user_id, next, null);
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "access_reactivated",
        });
        return { ok: true as const, lifecycle: next };
      }
      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }
  });

/** Alias do contrato Fase 1 — preferir em código novo. */
export const applyRecoveryAction = performAccessRecovery;
