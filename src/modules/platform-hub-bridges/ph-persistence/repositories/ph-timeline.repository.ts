import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PhTimelineEventKind =
  | "connection_created"
  | "connection_updated"
  | "provider_changed"
  | "oauth_completed"
  | "oauth_failed"
  | "credential_updated"
  | "identity_attached"
  | "sync_started"
  | "sync_finished"
  | "sync_failed"
  | "health_changed"
  | "migration_stage_changed"
  | "diagnostic_run"
  | "reconnect"
  | "connection_disabled"
  | "connection_deleted";

export interface PhTimelineEventV1 {
  id: string;
  connectionId: string | null;
  cadastroId: number | null;
  kind: PhTimelineEventKind;
  title: string;
  detail: string | null;
  metadata: Record<string, unknown>;
  actorEmail: string | null;
  createdAt: string;
}

export class PhTimelineRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async append(input: {
    connectionId?: string | null;
    cadastroId?: number | null;
    kind: PhTimelineEventKind;
    title: string;
    detail?: string;
    metadata?: Record<string, unknown>;
    actorEmail?: string;
  }): Promise<PhTimelineEventV1> {
    const row = {
      id: randomUUID(),
      connection_id: input.connectionId ?? null,
      cadastro_id: input.cadastroId ?? null,
      kind: input.kind,
      title: input.title,
      detail: input.detail ?? null,
      metadata: input.metadata ?? {},
      actor_email: input.actorEmail ?? null,
      created_at: new Date().toISOString(),
    };
    const { error } = await this.supabase.from("ph_timeline_events").insert(row);
    if (error) throw new Error(`ph_timeline_events insert failed: ${error.message}`);
    return {
      id: row.id,
      connectionId: row.connection_id,
      cadastroId: row.cadastro_id,
      kind: row.kind,
      title: row.title,
      detail: row.detail,
      metadata: row.metadata,
      actorEmail: row.actor_email,
      createdAt: row.created_at,
    };
  }

  async listRecent(limit = 50, connectionId?: string): Promise<PhTimelineEventV1[]> {
    let query = this.supabase
      .from("ph_timeline_events")
      .select("id,connection_id,cadastro_id,kind,title,detail,metadata,actor_email,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (connectionId) query = query.eq("connection_id", connectionId);
    const { data, error } = await query;
    if (error) throw new Error(`ph_timeline_events list failed: ${error.message}`);
    return (data ?? []).map((row) => ({
      id: row.id as string,
      connectionId: row.connection_id as string | null,
      cadastroId: row.cadastro_id as number | null,
      kind: row.kind as PhTimelineEventKind,
      title: row.title as string,
      detail: row.detail as string | null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      actorEmail: row.actor_email as string | null,
      createdAt: row.created_at as string,
    }));
  }
}
