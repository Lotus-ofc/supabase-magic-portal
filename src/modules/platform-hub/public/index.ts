/**
 * API pública do Platform Hub — composição + registry + tipos.
 * Consumidores externos preferem estes exports a imports profundos.
 */
export type {
  Capability,
  ConnectionId,
  HubRegistryPort,
  IngestEnvelopeV1,
  MetricPipelinePort,
  MetricWriterPort,
  PluginAdapterPort,
  PluginKey,
  PluginLoaderPort,
  PluginManifest,
  PluginRegistration,
  ProviderPort,
  ScopeRef,
} from "../ports";

export { asConnectionId } from "../ports";
export { createHubRegistry } from "../registry/create-hub-registry";
export { createHubRegistryWithCredentials } from "../registry/create-hub-registry-with-credentials";
export { GlobPluginLoader } from "../registry/glob-plugin-loader";
export { HubRegistry } from "../registry/hub-registry";

export { createPlatformHubStack, createObservabilityStack } from "../bootstrap";
export type {
  CreatePlatformHubStackOptions,
  CreateObservabilityStackOptions,
  WriterMode,
} from "../bootstrap";

export { createRuntimeStack } from "../runtime/create-runtime-stack";
export type { CreateRuntimeStackOptions } from "../runtime/create-runtime-stack";

export { createMetricPipelineStack } from "../metric-pipeline/create-metric-pipeline-stack";
export type { CreateMetricPipelineStackOptions } from "../metric-pipeline/create-metric-pipeline-stack";

export { createConnectionStack } from "../connections/create-connection-stack";
export { createHealthStack } from "../health/create-health-stack";

export { registerPlatformHubModule } from "../register-with-core";
