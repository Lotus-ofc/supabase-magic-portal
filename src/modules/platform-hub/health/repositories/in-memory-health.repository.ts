import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { HealthRepositoryPort } from "../ports/health-repository.port";
import type { HealthSnapshotV1 } from "../types";

export class InMemoryHealthRepository implements HealthRepositoryPort {
  private readonly snapshots = new Map<ConnectionId, HealthSnapshotV1>();

  async save(snapshot: HealthSnapshotV1): Promise<HealthSnapshotV1> {
    const copy = { ...snapshot, breakdown: [...snapshot.breakdown] };
    this.snapshots.set(snapshot.connectionId, copy);
    return { ...copy, breakdown: [...copy.breakdown] };
  }

  async get(connectionId: ConnectionId): Promise<HealthSnapshotV1 | null> {
    const snapshot = this.snapshots.get(connectionId);
    return snapshot ? { ...snapshot, breakdown: [...snapshot.breakdown] } : null;
  }
}
