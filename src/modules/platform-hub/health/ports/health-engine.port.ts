import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { HealthInboundSignalV1 } from "../types";
import type { HealthSnapshotV1 } from "../types";

export interface HealthEnginePort {
  accept(signal: HealthInboundSignalV1): Promise<HealthSnapshotV1>;
  get(connectionId: ConnectionId): Promise<HealthSnapshotV1>;
  reconcile(connectionId: ConnectionId): Promise<HealthSnapshotV1>;
}
