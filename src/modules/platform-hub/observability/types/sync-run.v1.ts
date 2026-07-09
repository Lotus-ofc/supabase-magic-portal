import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { PluginKey } from "../../../../contracts/plugin/capability.v1";
import type { ProviderType } from "../../../../contracts/ingest/ingest-envelope.v1";
import type { ExecutionId } from "../../runtime/types";
import type { HubTraceContext } from "../types";

export type { HubTraceContext };

export interface SyncRunRecordV1 {
  executionId: ExecutionId;
  connectionId: ConnectionId;
  pluginKey: PluginKey;
  providerType: ProviderType;
  status: "success" | "failed";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  rowsCount: number;
  error?: string;
}

export interface HubSpanRecordV1 {
  name: string;
  context?: HubTraceContext;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
}
