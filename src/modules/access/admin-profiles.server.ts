import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import {
  assembleUserAccessProfile,
  authUserFromSupabase,
  reconcileLifecycle,
  type AccessLifecycleStatus,
} from "@/features/access";
import {
  assertAdminAccess,
  buildProfileForUserId,
  fetchAccessAccount,
  fetchAuditForUser,
  recordAccessAuditEntry,
  upsertLifecycle,
} from "@/modules/access/internal/access-db.server";

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

export const getUserAccessProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdminAccess(context);
    return buildProfileForUserId(data.user_id);
  });

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

export const transitionUserLifecycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        lifecycle_status: z.enum([
          "invite_pending",
          "awaiting_password",
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
