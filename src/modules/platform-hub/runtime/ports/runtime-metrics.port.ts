import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ExecutionResultV1 } from "../types";

export interface RuntimeMetricsSnapshotV1 {
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  averageDurationMs: number;
}

export interface RuntimeMetricsPort {
  record(result: ExecutionResultV1): void;
  snapshot(connectionId?: ConnectionId): RuntimeMetricsSnapshotV1;
}
