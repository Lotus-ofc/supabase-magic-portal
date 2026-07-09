import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { ConnectionRepositoryPort } from "../ports/connection-repository.port";
import type { ConnectionRecordV1, UpdateConnectionInputV1 } from "../types/connection-record.v1";

export class InMemoryConnectionRepository implements ConnectionRepositoryPort {
  private readonly records = new Map<ConnectionId, ConnectionRecordV1>();

  async create(record: ConnectionRecordV1): Promise<ConnectionRecordV1> {
    if (this.records.has(record.connectionId)) {
      throw new Error(`Connection already exists: ${record.connectionId}`);
    }
    this.records.set(record.connectionId, { ...record });
    return { ...record };
  }

  async get(connectionId: ConnectionId): Promise<ConnectionRecordV1 | null> {
    const record = this.records.get(connectionId);
    return record ? { ...record } : null;
  }

  async update(
    connectionId: ConnectionId,
    patch: UpdateConnectionInputV1,
  ): Promise<ConnectionRecordV1> {
    const current = this.records.get(connectionId);
    if (!current) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    const updated: ConnectionRecordV1 = {
      ...current,
      label: patch.label ?? current.label,
      status: patch.status ?? current.status,
      activeProviderType: patch.activeProviderType ?? current.activeProviderType,
      updatedAt: new Date().toISOString(),
    };
    this.records.set(connectionId, updated);
    return { ...updated };
  }

  async list(): Promise<readonly ConnectionRecordV1[]> {
    return [...this.records.values()]
      .map((record) => ({ ...record }))
      .sort((a, b) => a.connectionId.localeCompare(b.connectionId));
  }

  async delete(connectionId: ConnectionId): Promise<void> {
    if (!this.records.delete(connectionId)) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
  }
}
