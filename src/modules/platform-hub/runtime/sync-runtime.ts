import { EXECUTION_RESULT_CONTRACT_VERSION } from "../../../../contracts/runtime/execution-result.v1";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ConnectionServicePort } from "@/modules/platform-hub/connections/ports/connection-service.port";
import type { HealthEnginePort } from "@/modules/platform-hub/health/ports/health-engine.port";
import type { IntegrationEventEmitterPort } from "@/modules/platform-hub/events/integration-event-emitter.port";
import type { HubObservabilityPort } from "@/modules/platform-hub/observability/ports";
import type { SyncRunRepositoryPort } from "@/modules/platform-hub/observability/ports/sync-run-repository.port";
import { persistSyncRun } from "@/modules/platform-hub/observability/record-sync-run";
import {
  buildIntegrationSyncFailedEvent,
  buildIntegrationSyncFinishedEvent,
} from "@/modules/platform-hub/events/event-payloads";
import { toHealthInboundSignal } from "@/modules/platform-hub/health/adapters/integration-event.adapter";
import type { SyncOrchestratorPort } from "./ports/sync-orchestrator.port";
import type { RuntimeRepositoryPort } from "./ports/runtime-repository.port";
import type { RetryExecutorPort } from "./ports/retry-executor.port";
import type { RetryPolicyPort } from "./ports/retry-policy.port";
import type { RuntimeMetricsPort } from "./ports/runtime-metrics.port";
import type { SyncRuntimeExecutePort } from "./ports/sync-runtime.port";
import type { ExecutionResultV1 } from "./types";
import { createExecutionContext } from "./create-execution-context";

/** Motor de execução genérico — conhece apenas ConnectionId e contratos. */
export class SyncRuntime implements SyncRuntimeExecutePort {
  constructor(
    private readonly connectionService: ConnectionServicePort,
    private readonly orchestrator: SyncOrchestratorPort,
    private readonly healthEngine: HealthEnginePort,
    private readonly repository: RuntimeRepositoryPort,
    private readonly retryExecutor: RetryExecutorPort,
    private readonly retryPolicy: RetryPolicyPort,
    private readonly metrics: RuntimeMetricsPort,
    private readonly eventEmitter?: IntegrationEventEmitterPort,
    private readonly observability?: HubObservabilityPort,
    private readonly syncRunRepository?: SyncRunRepositoryPort,
  ) {}

  async execute(connectionId: ConnectionId): Promise<ExecutionResultV1> {
    const connection = await this.connectionService.get(connectionId);
    const context = createExecutionContext({
      connectionId,
      providerType: connection.activeProviderType,
      capability: connection.capability,
    });

    const span = this.observability?.startSpan("sync.execute", {
      correlationId: context.executionId,
      connectionId,
      pluginKey: connection.pluginKey,
    });

    const startedAt = context.startedAt;

    try {
      const envelope = await this.retryExecutor.run(
        () => this.orchestrator.collect(context),
        this.retryPolicy,
      );

      const finishedAt = new Date().toISOString();
      const result: ExecutionResultV1 = {
        version: EXECUTION_RESULT_CONTRACT_VERSION,
        executionId: context.executionId,
        connectionId,
        providerType: context.providerType,
        status: "success",
        startedAt,
        finishedAt,
        durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
        envelope,
      };

      await this.repository.save(result);
      this.metrics.record(result);
      await this.emitOutcome(connection, result);

      span?.end();
      return result;
    } catch (error) {
      const finishedAt = new Date().toISOString();
      const failed: ExecutionResultV1 = {
        version: EXECUTION_RESULT_CONTRACT_VERSION,
        executionId: context.executionId,
        connectionId,
        providerType: context.providerType,
        status: "failed",
        startedAt,
        finishedAt,
        durationMs: Date.parse(finishedAt) - Date.parse(startedAt),
        error: error instanceof Error ? error.message : String(error),
      };

      await this.repository.save(failed);
      this.metrics.record(failed);

      const consecutiveErrors = await this.repository.countConsecutiveFailures(connectionId);
      await this.emitOutcome(connection, failed, consecutiveErrors);

      span?.end();
      return failed;
    }
  }

  private async emitOutcome(
    connection: Awaited<ReturnType<ConnectionServicePort["get"]>>,
    result: ExecutionResultV1,
    consecutiveErrors = 0,
  ): Promise<void> {
    const integrationEvent =
      result.status === "success"
        ? buildIntegrationSyncFinishedEvent(connection, result)
        : buildIntegrationSyncFailedEvent(connection, result, consecutiveErrors);

    if (this.eventEmitter) {
      await this.eventEmitter.emit(integrationEvent);
    }

    await this.healthEngine.accept(toHealthInboundSignal(integrationEvent));

    if (this.syncRunRepository) {
      await persistSyncRun(this.syncRunRepository, connection, result);
    }
  }
}
