import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";

/** Scheduler fake/manual — Fase 5. Runtime substituirá na Fase 6+. */
export interface ReconciliationSchedulerPort {
  reconcile(connectionId: ConnectionId): Promise<void>;
  reconcileAll(connectionIds: readonly ConnectionId[]): Promise<void>;
}
