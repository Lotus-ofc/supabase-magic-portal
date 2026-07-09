/**
 * @contract ExecutionContext v1.0.0
 * @see contracts/runtime/contract.meta.json
 */

import type { ConnectionId } from "../connection/connection-id.v1";
import type { Capability } from "../plugin/capability.v1";
import type { ProviderType } from "../ingest/ingest-envelope.v1";

export const EXECUTION_CONTEXT_CONTRACT_VERSION = "1.0.0" as const;

export type ExecutionId = string & { readonly __brand: "ExecutionId" };

export function asExecutionId(value: string): ExecutionId {
  return value as ExecutionId;
}

export interface ExecutionContextV1 {
  readonly version: typeof EXECUTION_CONTEXT_CONTRACT_VERSION;
  executionId: ExecutionId;
  connectionId: ConnectionId;
  providerType: ProviderType;
  capability: Capability;
  startedAt: string;
}
