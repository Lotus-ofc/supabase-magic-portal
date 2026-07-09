import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ExecutionResultV1 } from "../types";
import type { RuntimeRepositoryPort } from "../ports/runtime-repository.port";

export class InMemoryRuntimeRepository implements RuntimeRepositoryPort {
  private readonly records = new Map<ExecutionResultV1["executionId"], ExecutionResultV1>();
  private readonly byConnection = new Map<ConnectionId, ExecutionResultV1[]>();

  async save(record: ExecutionResultV1): Promise<ExecutionResultV1> {
    const copy = { ...record };
    this.records.set(copy.executionId, copy);
    const list = this.byConnection.get(copy.connectionId) ?? [];
    list.push(copy);
    this.byConnection.set(copy.connectionId, list);
    return { ...copy };
  }

  async get(executionId: ExecutionResultV1["executionId"]): Promise<ExecutionResultV1 | null> {
    const record = this.records.get(executionId);
    return record ? { ...record } : null;
  }

  async listByConnection(connectionId: ConnectionId): Promise<readonly ExecutionResultV1[]> {
    const list = this.byConnection.get(connectionId) ?? [];
    return [...list]
      .map((record) => ({ ...record }))
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }

  async countConsecutiveFailures(connectionId: ConnectionId): Promise<number> {
    const list = await this.listByConnection(connectionId);
    let count = 0;
    for (let i = list.length - 1; i >= 0; i -= 1) {
      if (list[i]?.status === "failed") {
        count += 1;
      } else {
        break;
      }
    }
    return count;
  }
}
