import { randomUUID } from "node:crypto";
import {
  EXECUTION_CONTEXT_CONTRACT_VERSION,
  asExecutionId,
} from "../../../../contracts/runtime/execution-context.v1";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { Capability } from "../../../../contracts/plugin/capability.v1";
import type { ProviderType } from "../../../../contracts/ingest/ingest-envelope.v1";
import type { ExecutionContextV1 } from "../types";

export function newExecutionId() {
  return asExecutionId(randomUUID());
}

export function createExecutionContext(input: {
  connectionId: ConnectionId;
  providerType: ProviderType;
  capability: Capability;
  startedAt?: string;
}): ExecutionContextV1 {
  return {
    version: EXECUTION_CONTEXT_CONTRACT_VERSION,
    executionId: newExecutionId(),
    connectionId: input.connectionId,
    providerType: input.providerType,
    capability: input.capability,
    startedAt: input.startedAt ?? new Date().toISOString(),
  };
}
