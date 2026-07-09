/**
 * @contract ExecutionResult v1.0.0
 * @see contracts/runtime/contract.meta.json
 */

import type { ConnectionId } from "../connection/connection-id.v1";
import type { IngestEnvelopeV1, ProviderType } from "../ingest/ingest-envelope.v1";
import type { ExecutionId } from "./execution-context.v1";

export const EXECUTION_RESULT_CONTRACT_VERSION = "1.0.0" as const;

export type ExecutionStatusV1 = "success" | "failed";

export interface ExecutionResultV1 {
  readonly version: typeof EXECUTION_RESULT_CONTRACT_VERSION;
  executionId: ExecutionId;
  connectionId: ConnectionId;
  providerType: ProviderType;
  status: ExecutionStatusV1;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  envelope?: IngestEnvelopeV1;
  error?: string;
}
