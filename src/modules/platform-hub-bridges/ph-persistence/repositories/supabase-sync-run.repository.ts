import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { PluginKey } from "../../../../../contracts/plugin/capability.v1";
import type { ProviderType } from "../../../../../contracts/ingest/ingest-envelope.v1";
import { asExecutionId } from "../../../../../contracts/runtime/execution-context.v1";
import type { SyncRunRepositoryPort } from "@/modules/platform-hub/observability/ports/sync-run-repository.port";
import type { SyncRunRecordV1 } from "@/modules/platform-hub/observability/types/sync-run.v1";

type PhSyncRunRow = {
  id: string;
  connection_id: string;
  execution_id: string;
  provider_type: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  rows_collected: number;
  error_message: string | null;
};

export class SupabaseSyncRunRepository implements SyncRunRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async save(record: SyncRunRecordV1): Promise<SyncRunRecordV1> {
    const { error } = await this.supabase.from("ph_sync_runs").insert({
      id: randomUUID(),
      connection_id: record.connectionId,
      execution_id: record.executionId,
      provider_type: record.providerType,
      status: record.status,
      started_at: record.startedAt,
      finished_at: record.finishedAt,
      duration_ms: record.durationMs,
      rows_collected: record.rowsCount,
      error_message: record.error ?? null,
    });
    if (error) throw new Error(`ph_sync_runs insert failed: ${error.message}`);

    await this.supabase
      .from("ph_connections")
      .update({
        last_sync_at: record.finishedAt,
        last_sync_status: record.status,
        last_error: record.error ?? null,
        metrics_count: record.rowsCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", record.connectionId);

    return { ...record };
  }

  async listByConnection(connectionId: ConnectionId): Promise<readonly SyncRunRecordV1[]> {
    const { data, error } = await this.supabase
      .from("ph_sync_runs")
      .select(
        "id,connection_id,execution_id,provider_type,status,started_at,finished_at,duration_ms,rows_collected,error_message,ph_connections(plugin_key)",
      )
      .eq("connection_id", connectionId)
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(`ph_sync_runs list failed: ${error.message}`);

    return (data ?? []).map((row) => {
      const r = row as PhSyncRunRow & { ph_connections: { plugin_key: string } | null };
      return {
        executionId: asExecutionId(r.execution_id),
        connectionId: asConnectionId(r.connection_id),
        pluginKey: (r.ph_connections?.plugin_key ?? "meta_ads") as PluginKey,
        providerType: r.provider_type as ProviderType,
        status: r.status as SyncRunRecordV1["status"],
        startedAt: r.started_at,
        finishedAt: r.finished_at ?? r.started_at,
        durationMs: r.duration_ms ?? 0,
        rowsCount: r.rows_collected,
        error: r.error_message ?? undefined,
      };
    });
  }
}
