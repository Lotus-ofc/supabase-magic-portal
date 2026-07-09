import { INTEGRATION_EVENTS_CONTRACT_VERSION } from "../../../../contracts/events/integration-events.v1";
import type { ConnectionRecordV1 } from "@/modules/platform-hub/connections/types/connection-record.v1";
import type { ExecutionResultV1 } from "./types";
import type { HealthInboundSignalV1 } from "@/modules/platform-hub/health/types";

export function buildSyncFinishedSignal(
  connection: ConnectionRecordV1,
  result: ExecutionResultV1,
): HealthInboundSignalV1 {
  const rowsCount =
    result.envelope && result.envelope.profile === "metrics-timeseries"
      ? result.envelope.payload.rows.length
      : 0;

  return {
    version: INTEGRATION_EVENTS_CONTRACT_VERSION,
    type: "INTEGRATION_SYNC_FINISHED",
    connectionId: connection.connectionId,
    pluginKey: connection.pluginKey,
    occurredAt: result.finishedAt,
    correlationId: result.executionId,
    payload: {
      latencyMs: result.durationMs,
      rowsCount,
      providerType: result.providerType,
    },
  };
}

export function buildSyncFailedSignal(
  connection: ConnectionRecordV1,
  result: ExecutionResultV1,
  consecutiveErrors: number,
): HealthInboundSignalV1 {
  return {
    version: INTEGRATION_EVENTS_CONTRACT_VERSION,
    type: "INTEGRATION_SYNC_FAILED",
    connectionId: connection.connectionId,
    pluginKey: connection.pluginKey,
    occurredAt: result.finishedAt,
    correlationId: result.executionId,
    payload: {
      errorCode: "SYNC_FAILED",
      consecutiveErrors,
      message: result.error,
    },
  };
}
