import type { HealthEnginePort } from "./ports/health-engine.port";
import type { ReconciliationSchedulerPort } from "./ports/reconciliation-scheduler.port";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";

/** Reconciliação manual — substituível por cron real na Fase 6+. */
export class ManualReconciliationScheduler implements ReconciliationSchedulerPort {
  constructor(private readonly engine: HealthEnginePort) {}

  async reconcile(connectionId: ConnectionId): Promise<void> {
    await this.engine.reconcile(connectionId);
  }

  async reconcileAll(connectionIds: readonly ConnectionId[]): Promise<void> {
    for (const connectionId of connectionIds) {
      await this.engine.reconcile(connectionId);
    }
  }
}
