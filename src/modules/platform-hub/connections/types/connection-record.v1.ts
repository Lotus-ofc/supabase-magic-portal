import type { Capability, PluginKey } from "../../../../contracts/plugin/capability.v1";
import type { ProviderType } from "../../../../contracts/ingest/ingest-envelope.v1";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ScopeRef } from "../../../../contracts/connection/scope-ref.v1";

export type ConnectionStatus = "active" | "disabled";

/** Modelo de conexão — independente de plataforma (Fase 4). */
export interface ConnectionRecordV1 {
  readonly connectionId: ConnectionId;
  pluginKey: PluginKey;
  label: string;
  scopeRef: ScopeRef;
  capability: Capability;
  activeProviderType: ProviderType;
  status: ConnectionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConnectionInputV1 {
  pluginKey: PluginKey;
  label: string;
  scopeRef: ScopeRef;
  capability?: Capability;
  activeProviderType?: ProviderType;
}

export interface UpdateConnectionInputV1 {
  label?: string;
  status?: ConnectionStatus;
  activeProviderType?: ProviderType;
}
