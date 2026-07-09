/**
 * @contract SyncRuntime + PluginLoader v1.0.0
 * @see contracts/runtime/contract.meta.json
 */

import type { ConnectionId } from "../connection/connection-id.v1";
import type { Capability, PluginKey, PluginManifestV1 } from "../plugin/capability.v1";
import type { IngestEnvelopeV1 } from "../ingest/ingest-envelope.v1";
import type {
  NormalizedMetricBatchV1,
  WriteResultV1,
} from "../ingest/profiles/metrics-timeseries.v1";

export const SYNC_RUNTIME_CONTRACT_VERSION = "1.0.0" as const;
export const PLUGIN_LOADER_CONTRACT_VERSION = "1.0.0" as const;

export interface SyncJobV1 {
  readonly version: typeof SYNC_RUNTIME_CONTRACT_VERSION;
  connectionId: ConnectionId;
  capability: Capability;
  scheduledAt: string;
  correlationId?: string;
}

/** Runtime conhece apenas ConnectionId — nunca tenant, cliente ou cadastro. */
export interface SyncRuntimePortV1 {
  enqueue(job: SyncJobV1): Promise<{ jobId: string }>;
}

export interface MetricWriterPortV1 {
  readonly writerKey: string;
  write(batch: NormalizedMetricBatchV1): Promise<WriteResultV1>;
}

export interface MetricPipelinePortV1 {
  accept(
    envelope: IngestEnvelopeV1,
  ): Promise<{ accepted: boolean; writerResults: WriteResultV1[] }>;
}

export interface PluginModuleV1 {
  manifest: PluginManifestV1;
  register(): void;
}

/** PluginLoader — GlobPluginLoader é impl default (Fase 1). */
export interface PluginLoaderV1 {
  discover(): Promise<readonly PluginManifestV1[]>;
  load(key: PluginKey): Promise<PluginModuleV1>;
}
