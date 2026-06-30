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
    const profile = await buildProfileForUserId(context.userId);
    return {
      ok: profile.can_access_platform,
      lifecycle_status: profile.lifecycle_status,
      effective_status: profile.effective_status,
    };
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

// ---------- Callback / convite: aceitar invite (server) ----------
export const markInviteAccepted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await upsertLifecycle(context.userId, "awaiting_password");
    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "invite_accepted",
    });
    return { ok: true as const };
  });

// ---------- Set password concluído (server) ----------
export const markFirstAccessCompleted = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await upsertLifecycle(context.userId, "active");
    await recordAccessAuditEntry({
      user_id: context.userId,
      actor_id: context.userId,
      action: "first_access_completed",
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
