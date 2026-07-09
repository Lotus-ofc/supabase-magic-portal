/**
 * Tipos compartilhados — re-export dos contratos v1 usados pelo Hub.
 * Fonte de verdade: contracts/
 */
export type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
export { asConnectionId } from "../../../../contracts/connection/connection-id.v1";

export type { ScopeRef } from "../../../../contracts/connection/scope-ref.v1";

export type {
  Capability,
  PluginKey,
  PluginKind,
  PluginManifestV1,
  MetricDefinitionV1,
} from "../../../../contracts/plugin/capability.v1";

export type {
  IngestEnvelopeV1,
  ProviderType,
  MetricsTimeseriesIngestEnvelopeV1,
} from "../../../../contracts/ingest/ingest-envelope.v1";
export { isMetricsTimeseriesEnvelope } from "../../../../contracts/ingest/ingest-envelope.v1";

export type {
  MetricBatchV1,
  NormalizedMetricBatchV1,
  MetricRowV1,
  WriteResultV1,
} from "../../../../contracts/ingest/profiles/metrics-timeseries.v1";

export type {
  PlatformIdentityV1,
  IdentityType,
} from "../../../../contracts/identity/platform-identity.v1";

import type { PluginAdapterPort } from "./plugin-adapter.port";

/** Alias hub — mesmo schema que PluginManifestV1. */
export type PluginManifest = import("../../../../contracts/plugin/capability.v1").PluginManifestV1;

export interface PluginModule {
  manifest: PluginManifest;
  adapter: PluginAdapterPort;
  register: () => void;
}
