import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ProviderPortV1 } from "../../../../contracts/provider/provider.v1";
import type { ProviderType } from "../../../../contracts/ingest/ingest-envelope.v1";
import type {
  ConnectionRecordV1,
  CreateConnectionInputV1,
  UpdateConnectionInputV1,
} from "../types/connection-record.v1";

export interface ConnectionServicePort {
  create(input: CreateConnectionInputV1): Promise<ConnectionRecordV1>;
  get(connectionId: ConnectionId): Promise<ConnectionRecordV1>;
  update(connectionId: ConnectionId, patch: UpdateConnectionInputV1): Promise<ConnectionRecordV1>;
  list(): Promise<readonly ConnectionRecordV1[]>;
  delete(connectionId: ConnectionId): Promise<void>;
  setActiveProvider(
    connectionId: ConnectionId,
    providerType: ProviderType,
  ): Promise<ConnectionRecordV1>;
  getActiveProvider(connectionId: ConnectionId): Promise<ProviderPortV1>;
}
