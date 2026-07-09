import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { HealthSignalStorePort } from "../ports/health-signal-store.port";
import type { StoredHealthSignalV1 } from "../types";

export class InMemoryHealthSignalStore implements HealthSignalStorePort {
  private readonly byConnection = new Map<ConnectionId, StoredHealthSignalV1[]>();

  async append(signal: StoredHealthSignalV1): Promise<void> {
    const list = this.byConnection.get(signal.connectionId) ?? [];
    list.push({ ...signal });
    this.byConnection.set(signal.connectionId, list);
  }

  async listByConnection(connectionId: ConnectionId): Promise<readonly StoredHealthSignalV1[]> {
    const list = this.byConnection.get(connectionId) ?? [];
    return [...list].sort((a, b) => {
      const timeDiff = a.signal.occurredAt.localeCompare(b.signal.occurredAt);
      if (timeDiff !== 0) return timeDiff;
      return a.sequence - b.sequence;
    });
  }

  async clear(connectionId: ConnectionId): Promise<void> {
    this.byConnection.delete(connectionId);
  }
}
