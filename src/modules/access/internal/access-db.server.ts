import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import {
  assembleUserAccessProfile,
  authUserFromSupabase,
  canTransitionLifecycle,
  type AccessAuditAction,
  type AccessLifecycleStatus,
} from "@/features/access";

export type AdminCtx = {
  userId: string;
  claims?: { email?: string | null };
};

export async function assertAdminAccess(ctx: AdminCtx) {
  const { resolveIsAdmin } = await import("@/lib/owner-admin");
  const ok = await resolveIsAdmin({
    supabase: getSupabaseAdmin(),
    userId: ctx.userId,
    email: ctx.claims?.email ?? undefined,
    repair: true,
  });
  if (!ok) throw new Error("Forbidden: admin role required");
}

export async function fetchAccessAccount(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("access_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchAuditForUser(userId: string, limit = 50) {
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

export async function upsertLifecycle(
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

export async function buildProfileForUserId(userId: string) {
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

export async function invalidateAllSessions(userId: string) {
  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc("access_invalidate_auth_sessions", {
    _user_id: userId,
  });
  if (error) throw new Error(error.message);
}
