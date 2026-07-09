import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { StoredHealthSignalV1 } from "../types";

export interface HealthSignalStorePort {
  append(signal: StoredHealthSignalV1): Promise<void>;
  listByConnection(connectionId: ConnectionId): Promise<readonly StoredHealthSignalV1[]>;
  clear(connectionId: ConnectionId): Promise<void>;
}
