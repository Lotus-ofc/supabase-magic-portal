import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ExecutionResultV1 } from "../types";

export interface RuntimeRepositoryPort {
  save(record: ExecutionResultV1): Promise<ExecutionResultV1>;
  get(executionId: ExecutionResultV1["executionId"]): Promise<ExecutionResultV1 | null>;
  listByConnection(connectionId: ConnectionId): Promise<readonly ExecutionResultV1[]>;
  countConsecutiveFailures(connectionId: ConnectionId): Promise<number>;
}
