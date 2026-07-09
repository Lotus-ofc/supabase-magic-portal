import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ExecutionResultV1 } from "../types";
import type { SyncRuntimeExecutePort } from "./sync-runtime.port";

export interface ManualSchedulerPort {
  run(connectionId: ConnectionId): Promise<ExecutionResultV1>;
  runAll(connectionIds: readonly ConnectionId[]): Promise<readonly ExecutionResultV1[]>;
}

export type { SyncRuntimeExecutePort as ManualSchedulerRuntime };
