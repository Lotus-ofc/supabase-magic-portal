/**
 * Access API — Gestão de Acessos Lots BI v2.1
 * Supabase Admin API para identidade; Postgres Lots BI para lifecycle + audit.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import {
  assembleUserAccessProfile,
  authUserFromSupabase,
  canTransitionLifecycle,
  reconcileLifecycle,
  type AccessAuditAction,
  type AccessLifecycleStatus,
} from "@/features/access";

type AdminCtx = {
  userId: string;
  claims?: { email?: string | null };
};

async function assertAdminAccess(ctx: AdminCtx) {
  const { resolveIsAdmin } = await import("@/lib/owner-admin");
  const ok = await resolveIsAdmin({
    supabase: getSupabaseAdmin(),
    userId: ctx.userId,
    email: ctx.claims?.email ?? undefined,
    repair: true,
  });
  if (!ok) throw new Error("Forbidden: admin role required");
}

async function fetchAccessAccount(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("access_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function fetchAuditForUser(userId: string, limit = 50) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("access_audit_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function recordAccessAuditEntry(params: {
  user_id: string;
  actor_id?: string | null;
  action: AccessAuditAction | string;
  detail?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("access_audit_log").insert({
    user_id: params.user_id,
    actor_id: params.actor_id ?? null,
    action: params.action,
    detail: params.detail ?? null,
    metadata: params.metadata ?? {},
  });
  if (error) throw new Error(error.message);
}

async function upsertLifecycle(
  userId: string,
  status: AccessLifecycleStatus,
  blockedReason?: string | null,
) {
  const admin = getSupabaseAdmin();
  const existing = await fetchAccessAccount(userId);
  if (existing && !canTransitionLifecycle(existing.lifecycle_status, status)) {
    throw new Error(`Transição de lifecycle inválida: ${existing.lifecycle_status} → ${status}`);
  }
  const { error } = await admin.from("access_accounts").upsert(
    {
      user_id: userId,
      lifecycle_status: status,
      blocked_reason: blockedReason ?? existing?.blocked_reason ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

async function buildProfileForUserId(userId: string) {
  const admin = getSupabaseAdmin();
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError) throw new Error(userError.message);
  if (!userData.user) throw new Error("Usuário não encontrado.");

  const authUser = authUserFromSupabase(userData.user);
  const [accessAccount, rolesRes, accessRes, profileRes, auditRows] = await Promise.all([
    fetchAccessAccount(userId),
    admin.from("user_roles").select("role").eq("user_id", userId),
    admin.from("client_access").select("cliente_nome").eq("user_id", userId),
    admin.from("profiles").select("nome").eq("id", userId).maybeSingle(),
    fetchAuditForUser(userId),
  ]);

  if (rolesRes.error) throw new Error(rolesRes.error.message);
  if (accessRes.error) throw new Error(accessRes.error.message);
  if (profileRes.error) throw new Error(profileRes.error.message);

  return assembleUserAccessProfile({
    authUser,
    accessAccount: accessAccount as Parameters<
      typeof assembleUserAccessProfile
    >[0]["accessAccount"],
    roles: (rolesRes.data ?? []).map((r: { role: string }) => r.role),
    clientes: (accessRes.data ?? []).map((a: { cliente_nome: string }) => a.cliente_nome),
    nome: (profileRes.data?.nome as string | null) ?? null,
    auditRows: auditRows as Parameters<typeof assembleUserAccessProfile>[0]["auditRows"],
  });
}

// ---------- Público autenticado: verificar acesso à plataforma ----------
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
      // Migration ainda não aplicada — não bloquear plataforma (zero-downtime)
      return { ok: true, lifecycle_status: "active", effective_status: "active", legacy: true };
    }
  });

// ---------- Admin: versão do módulo ----------
export const getAuthModuleVersion = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdminAccess(context);
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("system_metadata")
      .select("value")
      .eq("key", "AUTH_MODULE_VERSION")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { version: data?.value ?? "unknown" };
  });

// ---------- Admin: profile único ----------
export const getUserAccessProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context);
    return buildProfileForUserId(data.user_id);
  });

// ---------- Admin: listagem paginada ----------
export const listUserAccessProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        page: z.number().int().min(1).default(1),
        per_page: z.number().int().min(1).max(200).default(50),
      })
      .optional()
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context);
    const page = data?.page ?? 1;
    const perPage = data?.per_page ?? 50;
    const admin = getSupabaseAdmin();

    const { data: usersPage, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);

    const userIds = usersPage.users.map((u) => u.id);
    if (userIds.length === 0) {
      return { profiles: [], page, per_page: perPage, total: usersPage.total ?? 0 };
    }

    const [accountsRes, rolesRes, accessRes, profilesRes] = await Promise.all([
      admin.from("access_accounts").select("*").in("user_id", userIds),
      admin.from("user_roles").select("user_id, role").in("user_id", userIds),
      admin.from("client_access").select("user_id, cliente_nome").in("user_id", userIds),
      admin.from("profiles").select("id, nome").in("id", userIds),
    ]);

    if (accountsRes.error) throw new Error(accountsRes.error.message);
    if (rolesRes.error) throw new Error(rolesRes.error.message);
    if (accessRes.error) throw new Error(accessRes.error.message);
    if (profilesRes.error) throw new Error(profilesRes.error.message);

    const accountByUser = new Map(
      (accountsRes.data ?? []).map((a: { user_id: string }) => [a.user_id, a]),
    );
    const rolesByUser = new Map<string, string[]>();
    for (const r of rolesRes.data ?? []) {
      const row = r as { user_id: string; role: string };
      const arr = rolesByUser.get(row.user_id) ?? [];
      arr.push(row.role);
      rolesByUser.set(row.user_id, arr);
    }
    const clientsByUser = new Map<string, string[]>();
    for (const a of accessRes.data ?? []) {
      const row = a as { user_id: string; cliente_nome: string };
      const arr = clientsByUser.get(row.user_id) ?? [];
      arr.push(row.cliente_nome);
      clientsByUser.set(row.user_id, arr);
    }
    const nomeByUser = new Map(
      (profilesRes.data ?? []).map((p: { id: string; nome: string | null }) => [p.id, p.nome]),
    );

    const profiles = await Promise.all(
      usersPage.users.map(async (u) => {
        const auditRows = await fetchAuditForUser(u.id, 20);
        return assembleUserAccessProfile({
          authUser: authUserFromSupabase(u),
          accessAccount: (accountByUser.get(u.id) ?? null) as Parameters<
            typeof assembleUserAccessProfile
          >[0]["accessAccount"],
          roles: rolesByUser.get(u.id) ?? [],
          clientes: clientsByUser.get(u.id) ?? [],
          nome: nomeByUser.get(u.id) ?? null,
          auditRows: auditRows as Parameters<typeof assembleUserAccessProfile>[0]["auditRows"],
        });
      }),
    );

    return {
      profiles,
      page,
      per_page: perPage,
      total: usersPage.total ?? profiles.length,
    };
  });

// ---------- Admin: transição lifecycle ----------
export const transitionUserLifecycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        lifecycle_status: z.enum([
          "invite_pending",
          "awaiting_password",
          "invite_expired",
          "active",
          "revoked",
          "disabled",
        ]),
        blocked_reason: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context);
    await upsertLifecycle(data.user_id, data.lifecycle_status, data.blocked_reason);
    await recordAccessAuditEntry({
      user_id: data.user_id,
      actor_id: context.userId,
      action: "lifecycle_reconciled",
      detail: `Lifecycle definido para ${data.lifecycle_status}`,
      metadata: { lifecycle_status: data.lifecycle_status },
    });
    return { ok: true as const };
  });

// ---------- Admin: reconciliar lifecycle ----------
export const reconcileUserAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context);
    const admin = getSupabaseAdmin();
    const { data: userData, error } = await admin.auth.admin.getUserById(data.user_id);
    if (error) throw new Error(error.message);
    if (!userData.user) throw new Error("Usuário não encontrado.");

    const account = await fetchAccessAccount(data.user_id);
    const current = (account?.lifecycle_status ?? "invite_pending") as AccessLifecycleStatus;
    const authUser = authUserFromSupabase(userData.user);
    const result = reconcileLifecycle(data.user_id, current, authUser);

    if (result.changed) {
      await upsertLifecycle(data.user_id, result.suggested_status);
      await recordAccessAuditEntry({
        user_id: data.user_id,
        actor_id: context.userId,
        action: "lifecycle_reconciled",
        detail: result.reasons.join(" "),
        metadata: {
          previous_status: result.previous_status,
          suggested_status: result.suggested_status,
        },
      });
    }

    return result;
  });

// ---------- Admin: audit timeline ----------
export const getUserAccessAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({ user_id: z.string().uuid(), limit: z.number().int().min(1).max(200).default(50) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context);
    return fetchAuditForUser(data.user_id, data.limit);
  });

// ---------- Callback / convite: aceitar invite (server, idempotente) ----------
export const markInviteAccepted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [account, auditRows] = await Promise.all([
      fetchAccessAccount(context.userId),
      fetchAuditForUser(context.userId, 100),
    ]);

    const alreadyAccepted = auditRows.some((r) => r.action === "invite_accepted");
    const current = (account?.lifecycle_status ?? "invite_pending") as AccessLifecycleStatus;

    if (current === "invite_pending") {
      await upsertLifecycle(context.userId, "awaiting_password");
    }

    if (!alreadyAccepted) {
      await recordAccessAuditEntry({
        user_id: context.userId,
        actor_id: context.userId,
        action: "invite_accepted",
      });
    }

    return { ok: true as const, skipped: alreadyAccepted };
  });

// ---------- Senha inicial definida (mantém awaiting_password até onboarding) ----------
export const markPasswordSet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const account = await fetchAccessAccount(context.userId);
    const current = (account?.lifecycle_status ?? "invite_pending") as AccessLifecycleStatus;

    if (current === "invite_pending") {
      await upsertLifecycle(context.userId, "awaiting_password");
    }

    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "password_changed",
      detail: "Senha inicial definida",
    });

    return { ok: true as const };
  });

// ---------- Onboarding concluído → lifecycle active ----------
export const markFirstAccessCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(context.userId);
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Usuário não encontrado.");

    const { isOnboardingComplete, parseLotsBiMetadata } =
      await import("@/features/access/lots-bi-metadata");
    const lotsBi = parseLotsBiMetadata(data.user.user_metadata);
    if (!isOnboardingComplete(lotsBi)) {
      throw new Error("Onboarding incompleto — defina senha e conclua o primeiro acesso.");
    }

    await upsertLifecycle(context.userId, "active");
    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "first_access_completed",
    });
    return { ok: true as const };
  });

// ---------- Recovery: senha redefinida pelo usuário ----------
export const markPasswordRecoveryCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "password_reset_completed",
    });
    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "password_changed",
      detail: "Senha redefinida via recovery",
    });
    return { ok: true as const };
  });

// ---------- Alteração de senha pelo usuário ----------
export const markPasswordChangedByUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "password_changed",
      detail: "Senha alterada pelo usuário",
    });
    return { ok: true as const };
  });

// ---------- Garantir row access_accounts ----------
export async function ensureAccessAccountRow(
  userId: string,
  initial: AccessLifecycleStatus = "invite_pending",
) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("access_accounts").upsert(
    {
      user_id: userId,
      lifecycle_status: initial,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
}

export type AccessRecoveryAction =
  | "recalculate_lifecycle"
  | "revalidate_metadata"
  | "resend_invite"
  | "cancel_invite"
  | "delete_user"
  | "restart_onboarding"
  | "invalidate_sessions"
  | "force_password_reset"
  | "reactivate"
  | "revoke"
  | "disable"
  | "auto_fix";

async function invalidateAllSessions(userId: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.signOut(userId, "global");
  if (error) throw new Error(error.message);
}

async function patchLegacyMetadataIfNeeded(userId: string): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw new Error(error.message);
  const user = data.user;
  if (!user) throw new Error("Usuário não encontrado.");

  const { parseLotsBiMetadata, buildLotsBiMetadataPatch, isOnboardingComplete } =
    await import("@/features/access/lots-bi-metadata");
  const lotsBi = parseLotsBiMetadata(user.user_metadata);
  if (isOnboardingComplete(lotsBi)) return false;

  // Legado v2.1: login anterior sem metadata — nunca convite ainda pendente.
  if (!user.last_sign_in_at) return false;

  const account = await fetchAccessAccount(userId);
  const lifecycle = (account?.lifecycle_status ?? "invite_pending") as AccessLifecycleStatus;
  if (lifecycle === "invite_pending") return false;

  const stamp = user.last_sign_in_at;
  const patch = buildLotsBiMetadataPatch(
    {
      password_set_at: lotsBi.password_set_at ?? stamp,
      onboarding_completed_at: lotsBi.onboarding_completed_at ?? stamp,
    },
    user.user_metadata,
  );
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: patch,
  });
  if (updateError) throw new Error(updateError.message);
  return true;
}

async function reconcileLifecycleAfterMetadataPatch(userId: string) {
  const admin = getSupabaseAdmin();
  const account = await fetchAccessAccount(userId);
  const current = (account?.lifecycle_status ?? "invite_pending") as AccessLifecycleStatus;
  const { data: refreshed, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw new Error(error.message);
  if (!refreshed.user) throw new Error("Usuário não encontrado.");

  const result = reconcileLifecycle(userId, current, authUserFromSupabase(refreshed.user));
  if (result.changed) {
    await upsertLifecycle(userId, result.suggested_status);
  }
  return result;
}

// ---------- Admin: Recovery Mode ----------
export const performAccessRecovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        action: z.enum([
          "recalculate_lifecycle",
          "revalidate_metadata",
          "resend_invite",
          "cancel_invite",
          "delete_user",
          "restart_onboarding",
          "invalidate_sessions",
          "force_password_reset",
          "reactivate",
          "revoke",
          "disable",
          "auto_fix",
        ]),
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
      case "recalculate_lifecycle": {
        const account = await fetchAccessAccount(data.user_id);
        const current = (account?.lifecycle_status ?? "invite_pending") as AccessLifecycleStatus;
        const { data: refreshed } = await admin.auth.admin.getUserById(data.user_id);
        const result = reconcileLifecycle(
          data.user_id,
          current,
          authUserFromSupabase(refreshed.user ?? authUser),
        );
        if (result.changed) {
          await upsertLifecycle(data.user_id, result.suggested_status);
        }
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "lifecycle_reconciled",
          detail: result.reasons.join(" ") || "Recálculo concluído.",
          metadata: { action, ...result },
        });
        return { ok: true as const, result };
      }
      case "auto_fix": {
        const account = await fetchAccessAccount(data.user_id);
        const current = (account?.lifecycle_status ?? "invite_pending") as AccessLifecycleStatus;
        if (action === "auto_fix") {
          await patchLegacyMetadataIfNeeded(data.user_id);
        }
        const { data: refreshed } = await admin.auth.admin.getUserById(data.user_id);
        const result = reconcileLifecycle(
          data.user_id,
          current,
          authUserFromSupabase(refreshed.user ?? authUser),
        );
        if (result.changed) {
          await upsertLifecycle(data.user_id, result.suggested_status);
        }
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "lifecycle_reconciled",
          detail: result.reasons.join(" ") || "Recálculo concluído.",
          metadata: { action, ...result },
        });
        return { ok: true as const, result };
      }
      case "revalidate_metadata": {
        const patched = await patchLegacyMetadataIfNeeded(data.user_id);
        let reconcileResult = null;
        if (patched) {
          reconcileResult = await reconcileLifecycleAfterMetadataPatch(data.user_id);
        }
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "metadata_revalidated",
          detail: patched
            ? "Metadata lots_bi alinhada para usuário legado."
            : "Metadata já consistente ou usuário ainda em convite.",
          metadata: reconcileResult ? { reconcile: reconcileResult } : {},
        });
        return { ok: true as const, patched, reconcile: reconcileResult };
      }
      case "resend_invite": {
        await invalidateAllSessions(data.user_id);
        const { resendAuthInviteEmail } = await import("@/lib/auth-invite.server");
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
      case "cancel_invite": {
        await invalidateAllSessions(data.user_id);
        await upsertLifecycle(data.user_id, "invite_expired");
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "invite_cancelled",
          detail: "Convite cancelado pelo admin.",
        });
        return { ok: true as const };
      }
      case "delete_user": {
        await invalidateAllSessions(data.user_id);
        await Promise.all([
          admin.from("client_access").delete().eq("user_id", data.user_id),
          admin.from("user_roles").delete().eq("user_id", data.user_id),
          admin.from("profiles").delete().eq("id", data.user_id),
        ]);
        const { error: deleteError } = await admin.auth.admin.deleteUser(data.user_id);
        if (deleteError) throw new Error(deleteError.message);
        return { ok: true as const, deleted: true };
      }
      case "restart_onboarding": {
        await invalidateAllSessions(data.user_id);
        const cleared = {
          ...(authUser.user_metadata ?? {}),
          lots_bi: {},
        };
        await admin.auth.admin.updateUserById(data.user_id, { user_metadata: cleared });
        await upsertLifecycle(data.user_id, "invite_pending");
        const { resendAuthInviteEmail } = await import("@/lib/auth-invite.server");
        await resendAuthInviteEmail(
          admin,
          authUser.email,
          data.user_id,
          { full_name: (authUser.user_metadata?.full_name as string | undefined) ?? null },
          data.client_origin,
        );
        await recordAccessAuditEntry({
          user_id: data.user_id,
          actor_id: context.userId,
          action: "onboarding_restarted",
        });
        return { ok: true as const };
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
        const { sendPasswordResetEmail } = await import("@/lib/auth-invite.server");
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
