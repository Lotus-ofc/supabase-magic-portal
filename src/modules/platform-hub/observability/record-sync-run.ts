import type { ExecutionResultV1 } from "../runtime/types";
import type { ConnectionRecordV1 } from "../connections/types/connection-record.v1";
import type { SyncRunRecordV1 } from "./types";
import type { SyncRunRepositoryPort } from "./ports/sync-run-repository.port";

export function recordSyncRun(
  connection: ConnectionRecordV1,
  result: ExecutionResultV1,
): SyncRunRecordV1 {
  const rowsCount =
    result.envelope && result.envelope.profile === "metrics-timeseries"
      ? result.envelope.payload.rows.length
      : 0;

  return {
    executionId: result.executionId,
    connectionId: result.connectionId,
    pluginKey: connection.pluginKey,
    providerType: result.providerType,
    status: result.status,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    durationMs: result.durationMs,
    rowsCount,
    error: result.error,
  };
}

export async function persistSyncRun(
  repository: SyncRunRepositoryPort,
  connection: ConnectionRecordV1,
  result: ExecutionResultV1,
): Promise<SyncRunRecordV1> {
  return repository.save(recordSyncRun(connection, result));
}
