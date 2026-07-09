import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type {
  ConnectionRecordV1,
  CreateConnectionInputV1,
  UpdateConnectionInputV1,
} from "../types/connection-record.v1";

export interface ConnectionRepositoryPort {
  create(record: ConnectionRecordV1): Promise<ConnectionRecordV1>;
  get(connectionId: ConnectionId): Promise<ConnectionRecordV1 | null>;
  update(connectionId: ConnectionId, patch: UpdateConnectionInputV1): Promise<ConnectionRecordV1>;
  list(): Promise<readonly ConnectionRecordV1[]>;
  delete(connectionId: ConnectionId): Promise<void>;
}

export type { CreateConnectionInputV1, UpdateConnectionInputV1, ConnectionRecordV1 };
