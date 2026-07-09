import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ExecutionResultV1 } from "../types";
import type { RuntimeMetricsPort, RuntimeMetricsSnapshotV1 } from "../ports/runtime-metrics.port";

export class InMemoryRuntimeMetrics implements RuntimeMetricsPort {
  private readonly results: ExecutionResultV1[] = [];

  record(result: ExecutionResultV1): void {
    this.results.push({ ...result });
  }

  snapshot(connectionId?: ConnectionId): RuntimeMetricsSnapshotV1 {
    const filtered = connectionId
      ? this.results.filter((result) => result.connectionId === connectionId)
      : this.results;

    const totalExecutions = filtered.length;
    const successCount = filtered.filter((result) => result.status === "success").length;
    const failedCount = filtered.filter((result) => result.status === "failed").length;
    const averageDurationMs =
      totalExecutions === 0
        ? 0
        : Math.round(
            filtered.reduce((sum, result) => sum + result.durationMs, 0) / totalExecutions,
          );

    return { totalExecutions, successCount, failedCount, averageDurationMs };
  }
}
