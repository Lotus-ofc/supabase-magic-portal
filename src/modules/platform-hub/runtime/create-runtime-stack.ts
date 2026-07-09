import { createConnectionStack } from "@/modules/platform-hub/connections/create-connection-stack";
import { createConnectionResolver } from "@/modules/platform-hub/connections/create-connection-resolver";
import { createHealthStack } from "@/modules/platform-hub/health/create-health-stack";
import type { IntegrationEventEmitterPort } from "@/modules/platform-hub/events/integration-event-emitter.port";
import type { HubObservabilityPort } from "@/modules/platform-hub/observability/ports";
import type { SyncRunRepositoryPort } from "@/modules/platform-hub/observability/ports/sync-run-repository.port";
import { InMemoryRuntimeRepository } from "./repositories/in-memory-runtime.repository";
import { RetryExecutor, SimpleRetryPolicy } from "./retry/retry-executor";
import { InMemoryRuntimeMetrics } from "./metrics/in-memory-runtime-metrics";
import { SyncOrchestrator } from "./sync-orchestrator";
import { SyncRuntime } from "./sync-runtime";
import { ManualScheduler } from "./manual-scheduler";

export interface CreateRuntimeStackOptions {
  retryMaxAttempts?: number;
  orchestrator?: SyncOrchestrator;
  eventEmitter?: IntegrationEventEmitterPort;
  observability?: HubObservabilityPort;
  syncRunRepository?: SyncRunRepositoryPort;
}

/** Factory — Runtime genérico sem plataforma, banco ou scheduler real. */
export function createRuntimeStack(options: CreateRuntimeStackOptions = {}) {
  const connectionStack = createConnectionStack();
  const healthStack = createHealthStack();
  const resolver = createConnectionResolver(connectionStack.bridge);

  const runtimeRepository = new InMemoryRuntimeRepository();
  const runtimeMetrics = new InMemoryRuntimeMetrics();
  const retryExecutor = new RetryExecutor();
  const retryPolicy = new SimpleRetryPolicy(options.retryMaxAttempts ?? 3);

  const orchestrator =
    options.orchestrator ??
    new SyncOrchestrator(
      connectionStack.connectionService,
      connectionStack.identityService,
      resolver,
    );

  const syncRuntime = new SyncRuntime(
    connectionStack.connectionService,
    orchestrator,
    healthStack.healthEngine,
    runtimeRepository,
    retryExecutor,
    retryPolicy,
    runtimeMetrics,
    options.eventEmitter,
    options.observability,
    options.syncRunRepository,
  );

  const manualScheduler = new ManualScheduler(syncRuntime);

  return {
    ...connectionStack,
    ...healthStack,
    resolver,
    runtimeRepository,
    runtimeMetrics,
    retryExecutor,
    retryPolicy,
    orchestrator,
    syncRuntime,
    manualScheduler,
  };
}
