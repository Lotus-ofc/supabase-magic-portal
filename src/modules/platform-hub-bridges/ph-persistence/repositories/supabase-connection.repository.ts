import type { SupabaseClient } from "@supabase/supabase-js";
import { asConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import { asScopeRef } from "../../../../../contracts/connection/scope-ref.v1";
import type { Capability, PluginKey } from "../../../../../contracts/plugin/capability.v1";
import type { ProviderType } from "../../../../../contracts/ingest/ingest-envelope.v1";
import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { ConnectionRepositoryPort } from "@/modules/platform-hub/connections/ports/connection-repository.port";
import type {
  ConnectionRecordV1,
  UpdateConnectionInputV1,
} from "@/modules/platform-hub/connections/types/connection-record.v1";

type PhConnectionRow = {
  id: string;
  plugin_key: string;
  label: string;
  scope_ref: string;
  capability: string;
  active_provider_type: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function toRecord(row: PhConnectionRow): ConnectionRecordV1 {
  return {
    connectionId: asConnectionId(row.id),
    pluginKey: row.plugin_key as PluginKey,
    label: row.label,
    scopeRef: asScopeRef(row.scope_ref),
    capability: row.capability as Capability,
    activeProviderType: row.active_provider_type as ProviderType,
    status: row.status as ConnectionRecordV1["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseConnectionRepository implements ConnectionRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(record: ConnectionRecordV1): Promise<ConnectionRecordV1> {
    const cadastroMatch = /^cadastro:(\d+)$/.exec(record.scopeRef);
    const { error } = await this.supabase.from("ph_connections").insert({
      id: record.connectionId,
      plugin_key: record.pluginKey,
      label: record.label,
      scope_ref: record.scopeRef,
      cadastro_id: cadastroMatch ? Number(cadastroMatch[1]) : null,
      capability: record.capability,
      active_provider_type: record.activeProviderType,
      status: record.status,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    });
    if (error) throw new Error(`ph_connections insert failed: ${error.message}`);
    return { ...record };
  }

  async get(connectionId: ConnectionId): Promise<ConnectionRecordV1 | null> {
    const { data, error } = await this.supabase
      .from("ph_connections")
      .select(
        "id,plugin_key,label,scope_ref,capability,active_provider_type,status,created_at,updated_at",
      )
      .eq("id", connectionId)
      .maybeSingle();
    if (error) throw new Error(`ph_connections get failed: ${error.message}`);
    return data ? toRecord(data as PhConnectionRow) : null;
  }

  async update(
    connectionId: ConnectionId,
    patch: UpdateConnectionInputV1,
  ): Promise<ConnectionRecordV1> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.label !== undefined) updates.label = patch.label;
    if (patch.status !== undefined) updates.status = patch.status;
    if (patch.activeProviderType !== undefined) {
      updates.active_provider_type = patch.activeProviderType;
    }
    const { data, error } = await this.supabase
      .from("ph_connections")
      .update(updates)
      .eq("id", connectionId)
      .select(
        "id,plugin_key,label,scope_ref,capability,active_provider_type,status,created_at,updated_at",
      )
      .single();
    if (error) throw new Error(`ph_connections update failed: ${error.message}`);
    return toRecord(data as PhConnectionRow);
  }

  async list(): Promise<readonly ConnectionRecordV1[]> {
    const { data, error } = await this.supabase
      .from("ph_connections")
      .select(
        "id,plugin_key,label,scope_ref,capability,active_provider_type,status,created_at,updated_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(`ph_connections list failed: ${error.message}`);
    return (data ?? []).map((row) => toRecord(row as PhConnectionRow));
  }

  async delete(connectionId: ConnectionId): Promise<void> {
    const { error } = await this.supabase.from("ph_connections").delete().eq("id", connectionId);
    if (error) throw new Error(`ph_connections delete failed: ${error.message}`);
  }
}
