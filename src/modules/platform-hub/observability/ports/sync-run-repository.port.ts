import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { SyncRunRecordV1 } from "../types";

export interface SyncRunRepositoryPort {
  save(record: SyncRunRecordV1): Promise<SyncRunRecordV1>;
  listByConnection(connectionId: ConnectionId): Promise<readonly SyncRunRecordV1[]>;
}
