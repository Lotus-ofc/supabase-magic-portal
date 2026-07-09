import { HEALTH_SIGNAL_CONTRACT_VERSION } from "../../../../contracts/health/health-signal.v1";
import { HEALTH_SNAPSHOT_CONTRACT_VERSION } from "../../../../contracts/health/health-snapshot.v1";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { PluginKey } from "../../../../contracts/plugin/capability.v1";
import type { HealthSignalStorePort } from "./ports/health-signal-store.port";
import type { HealthRepositoryPort } from "./ports/health-repository.port";
import type { HealthEvaluatorPort } from "./ports/health-evaluator.port";
import type { HealthEnginePort } from "./ports/health-engine.port";
import type { HealthInboundSignalV1, HealthSnapshotV1, StoredHealthSignalV1 } from "./types";
import { materializeHealthSignals } from "./materialize-health-signals";
import { scoreFromBreakdown, statusFromScore } from "./score-from-breakdown";

/** Motor de Health — cego ao Runtime; opera apenas sobre sinais persistidos. */
export class HealthEngine implements HealthEnginePort {
  private sequence = 0;

  constructor(
    private readonly signalStore: HealthSignalStorePort,
    private readonly repository: HealthRepositoryPort,
    private readonly evaluators: readonly HealthEvaluatorPort[],
  ) {}

  async accept(signal: HealthInboundSignalV1): Promise<HealthSnapshotV1> {
    const stored: StoredHealthSignalV1 = {
      version: HEALTH_SIGNAL_CONTRACT_VERSION,
      sequence: ++this.sequence,
      connectionId: signal.connectionId,
      pluginKey: signal.pluginKey,
      signal,
      receivedAt: new Date().toISOString(),
    };
    await this.signalStore.append(stored);
    return this.reconcile(signal.connectionId);
  }

  async get(connectionId: ConnectionId): Promise<HealthSnapshotV1> {
    const snapshot = await this.repository.get(connectionId);
    if (!snapshot) {
      return this.reconcile(connectionId);
    }
    return snapshot;
  }

  async reconcile(connectionId: ConnectionId): Promise<HealthSnapshotV1> {
    const signals = await this.signalStore.listByConnection(connectionId);
    const pluginKey = this.resolvePluginKey(signals);
    const materialized = materializeHealthSignals(signals);

    const breakdown =
      signals.length === 0
        ? this.evaluators.map((evaluator) => ({
            evaluatorKey: evaluator.key,
            score: 0,
            maxScore: evaluator.maxScore,
          }))
        : this.evaluators.map((evaluator) => evaluator.evaluate(connectionId, materialized));

    const score = signals.length === 0 ? 0 : scoreFromBreakdown(breakdown);
    const status = statusFromScore(score, signals.length > 0);

    const snapshot: HealthSnapshotV1 = {
      version: HEALTH_SNAPSHOT_CONTRACT_VERSION,
      connectionId,
      pluginKey,
      status,
      score,
      breakdown,
      lastUpdated: new Date().toISOString(),
    };

    return this.repository.save(snapshot);
  }

  private resolvePluginKey(signals: readonly StoredHealthSignalV1[]): PluginKey {
    const last = signals.at(-1);
    return last?.pluginKey ?? ("unknown" as PluginKey);
  }
}
