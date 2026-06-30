/**
 * Persistência de eventos de convite em access_audit_log (Lots BI v2.1).
 * Substitui o buffer in-memory como fonte primária.
 */
import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { recordAccessAuditEntry } from "@/modules/access/internal/access-db.server";
import type { InviteAuditAction, InviteAuditEntry } from "@/lib/infra/invite-audit";

export async function recordInviteAccessAudit(params: {
  email: string;
  user_id?: string;
  action: InviteAuditAction;
  app_url: string;
  redirect_to: string;
  success: boolean;
  error?: string;
  actor_id?: string | null;
}): Promise<void> {
  if (!params.user_id) return;

  const action = params.action === "resend" ? "invite_resent" : "invite_sent";

  try {
    await recordAccessAuditEntry({
      user_id: params.user_id,
      actor_id: params.actor_id ?? null,
      action: params.success ? action : "auth_error",
      detail: params.error ?? (params.success ? null : "Falha no envio de convite"),
      metadata: {
        email: params.email,
        app_url: params.app_url,
        redirect_to: params.redirect_to,
        success: params.success,
        invite_action: params.action,
      },
    });
  } catch (err) {
    console.warn("[access-audit] falha ao persistir convite:", err);
  }
}

export async function fetchInviteAuditLogFromDb(limit = 50): Promise<InviteAuditEntry[]> {
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("access_audit_log")
      .select("*")
      .in("action", ["invite_sent", "invite_resent", "auth_error"])
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data ?? []).map(mapRowToInviteEntry);
  } catch {
    return [];
  }
}

export async function fetchInviteStatsByUserIds(
  userIds: string[],
): Promise<Map<string, ReturnType<typeof emptyStats>>> {
  const result = new Map<string, ReturnType<typeof emptyStats>>();
  for (const id of userIds) result.set(id, emptyStats());

  if (userIds.length === 0) return result;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from("access_audit_log")
      .select("user_id, action, detail, metadata, created_at")
      .in("user_id", userIds)
      .in("action", ["invite_sent", "invite_resent", "auth_error"])
      .order("created_at", { ascending: true });

    if (error) throw error;

    for (const row of data ?? []) {
      const uid = row.user_id as string;
      const stats = result.get(uid) ?? emptyStats();
      const action = row.action as string;
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const success = meta.success !== false && action !== "auth_error";

      if (action === "invite_sent") stats.invite_count += 1;
      if (action === "invite_resent") stats.resend_count += 1;

      stats.last_sent_at = row.created_at as string;
      if (!stats.first_sent_at) stats.first_sent_at = row.created_at as string;
      stats.last_success = success;
      stats.last_error = success ? stats.last_error : ((row.detail as string) ?? null);

      result.set(uid, stats);
    }
  } catch {
    /* migration pode não estar aplicada */
  }

  return result;
}

function emptyStats() {
  return {
    last_sent_at: null as string | null,
    first_sent_at: null as string | null,
    resend_count: 0,
    invite_count: 0,
    last_success: null as boolean | null,
    last_error: null as string | null,
  };
}

function mapRowToInviteEntry(row: {
  id: string;
  user_id: string;
  action: string;
  detail: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}): InviteAuditEntry {
  const meta = row.metadata ?? {};
  const inviteAction = meta.invite_action === "resend" ? "resend" : "invite";
  return {
    id: row.id,
    at: row.created_at,
    email: (meta.email as string) ?? "",
    user_id: row.user_id,
    action: inviteAction,
    app_url: (meta.app_url as string) ?? "",
    redirect_to: (meta.redirect_to as string) ?? "",
    success: meta.success !== false && row.action !== "auth_error",
    error: row.detail ?? undefined,
  };
}
