import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { HealthSnapshotV1 } from "../types";

export interface HealthRepositoryPort {
  save(snapshot: HealthSnapshotV1): Promise<HealthSnapshotV1>;
  get(connectionId: ConnectionId): Promise<HealthSnapshotV1 | null>;
}
