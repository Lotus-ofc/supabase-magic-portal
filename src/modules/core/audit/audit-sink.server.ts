import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuditEntry } from "../types/audit";
import { auditLogger } from "./audit-logger";

export function createSupabaseAuditSink(supabase: SupabaseClient) {
  return async (entry: AuditEntry) => {
    const { error } = await supabase.from("core_audit_log").insert({
      action: entry.action,
      module: entry.module,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      actor_id: entry.actorId ?? null,
      actor_email: entry.actorEmail ?? null,
      before_state: entry.before ?? null,
      after_state: entry.after ?? null,
      source: entry.source,
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
    });
    if (error) console.error("[AuditSink] insert failed:", error.message);
  };
}

export function wireAuditPersistence(supabase: SupabaseClient): () => void {
  return auditLogger.addSink(createSupabaseAuditSink(supabase));
}
