import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ManualSchedulerPort } from "./ports/manual-scheduler.port";
import type { SyncRuntimeExecutePort } from "./ports/sync-runtime.port";

/** Scheduler manual — Fase 6. Sem cron, filas ou timers. */
export class ManualScheduler implements ManualSchedulerPort {
  constructor(private readonly runtime: SyncRuntimeExecutePort) {}

  async run(connectionId: ConnectionId) {
    return this.runtime.execute(connectionId);
  }

  async runAll(connectionIds: readonly ConnectionId[]) {
    const results = [];
    for (const connectionId of connectionIds) {
      results.push(await this.runtime.execute(connectionId));
    }
    return results;
  }
}
