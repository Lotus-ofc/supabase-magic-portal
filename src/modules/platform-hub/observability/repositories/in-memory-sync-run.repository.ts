import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { SyncRunRecordV1 } from "../types";
import type { SyncRunRepositoryPort } from "./sync-run-repository.port";

export class InMemorySyncRunRepository implements SyncRunRepositoryPort {
  private readonly records: SyncRunRecordV1[] = [];

  async save(record: SyncRunRecordV1): Promise<SyncRunRecordV1> {
    const copy = { ...record };
    this.records.push(copy);
    return { ...copy };
  }

  async listByConnection(connectionId: ConnectionId): Promise<readonly SyncRunRecordV1[]> {
    return this.records
      .filter((record) => record.connectionId === connectionId)
      .map((record) => ({ ...record }));
  }
}
