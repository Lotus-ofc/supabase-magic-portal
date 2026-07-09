import { asScopeRef } from "../../../../contracts/connection/scope-ref.v1";
import { createConnectionResolver } from "@/modules/platform-hub/connections/create-connection-resolver";
import { createConnectionStack } from "@/modules/platform-hub/connections/create-connection-stack";
import { createHealthStack } from "@/modules/platform-hub/health/create-health-stack";
import { createMetricPipelineStack } from "@/modules/platform-hub/metric-pipeline/create-metric-pipeline-stack";
import { createObservabilityStack } from "@/modules/platform-hub/observability/create-observability-stack";
import { collectIngestEnvelope } from "@/modules/platform-hub/plugins/_internal/provider-framework/collect-ingest-envelope";
import { InMemoryRuntimeRepository } from "@/modules/platform-hub/runtime/repositories/in-memory-runtime.repository";
import {
  RetryExecutor,
  SimpleRetryPolicy,
} from "@/modules/platform-hub/runtime/retry/retry-executor";
import { InMemoryRuntimeMetrics } from "@/modules/platform-hub/runtime/metrics/in-memory-runtime-metrics";
import { SyncRuntime } from "@/modules/platform-hub/runtime/sync-runtime";
import { ManualScheduler } from "@/modules/platform-hub/runtime/manual-scheduler";
import type { SyncOrchestratorPort } from "@/modules/platform-hub/runtime/ports/sync-orchestrator.port";
import type { GateAConfigV1 } from "./types";
import { patchOfficialMetaProvider } from "./patch-official-meta-provider";

/**
 * Composition root Gate A — fora do kernel.
 * Garante: memory writer only, janela configurável, observação sem escrita em prod.
 */
export function createGateAHubStack(config: GateAConfigV1) {
  const connectionStack = createConnectionStack();
  const healthStack = createHealthStack();
  const pipelineStack = createMetricPipelineStack({
    writerMode: "memory",
    supabaseWriterEnabled: false,
  });
  const observabilityStack = createObservabilityStack();
  const resolver = createConnectionResolver(connectionStack.bridge);

  connectionStack.bridge.registerCadastro({
    cadastroId: config.pilot.cadastroId,
    nomeCanonico: config.pilot.canonicalClientName,
  });

  const windowOrchestrator: SyncOrchestratorPort = {
    async collect(context) {
      const provider = await connectionStack.connectionService.getActiveProvider(
        context.connectionId,
      );
      const identities = await connectionStack.identityService.list(context.connectionId);
      return collectIngestEnvelope({
        resolver,
        provider,
        connectionId: context.connectionId,
        capability: context.capability,
        identities,
        window: config.window,
      });
    },
  };

  const runtimeRepository = new InMemoryRuntimeRepository();
  const runtimeMetrics = new InMemoryRuntimeMetrics();
  const retryExecutor = new RetryExecutor();
  const retryPolicy = new SimpleRetryPolicy(3);

  const syncRuntime = new SyncRuntime(
    connectionStack.connectionService,
    windowOrchestrator,
    healthStack.healthEngine,
    runtimeRepository,
    retryExecutor,
    retryPolicy,
    runtimeMetrics,
    observabilityStack.eventBus,
    observabilityStack.observability,
    observabilityStack.syncRunRepository,
  );

  const manualScheduler = new ManualScheduler(syncRuntime);

  patchOfficialMetaProvider({
    registry: connectionStack.registry,
    credentialVault: connectionStack.credentialVault,
    mode: config.mode ?? "live",
    graphVersion: config.meta.graphVersion,
    observability: observabilityStack.observability,
  });

  return {
    ...connectionStack,
    ...healthStack,
    ...pipelineStack,
    ...observabilityStack,
    resolver,
    syncRuntime,
    manualScheduler,
    scopeRef: asScopeRef(config.pilot.scopeRef ?? `cadastro:${config.pilot.cadastroId}`),
  };
}
