import { PLATFORM_IDENTITY_CONTRACT_VERSION } from "../../../../../contracts/identity/platform-identity.v1";
import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { IdentityId } from "../types/identity-id.v1";
import type { IdentityRepositoryPort } from "../ports/identity-repository.port";
import type { StoredPlatformIdentityV1 } from "../types/stored-identity.v1";
import { newIdentityId } from "../types/identity-id.v1";

export class InMemoryIdentityRepository implements IdentityRepositoryPort {
  private readonly records = new Map<IdentityId, StoredPlatformIdentityV1>();

  async create(identity: StoredPlatformIdentityV1): Promise<StoredPlatformIdentityV1> {
    this.records.set(identity.identityId, { ...identity });
    return { ...identity };
  }

  async get(identityId: IdentityId): Promise<StoredPlatformIdentityV1 | null> {
    const record = this.records.get(identityId);
    return record ? { ...record } : null;
  }

  async listByConnection(connectionId: ConnectionId): Promise<readonly StoredPlatformIdentityV1[]> {
    return [...this.records.values()]
      .filter((record) => record.connectionId === connectionId)
      .map((record) => ({ ...record }))
      .sort((a, b) => a.identityId.localeCompare(b.identityId));
  }

  async update(
    identityId: IdentityId,
    patch: Partial<StoredPlatformIdentityV1>,
  ): Promise<StoredPlatformIdentityV1> {
    const current = this.records.get(identityId);
    if (!current) {
      throw new Error(`Identity not found: ${identityId}`);
    }
    const updated: StoredPlatformIdentityV1 = {
      ...current,
      ...patch,
      identityId: current.identityId,
      connectionId: current.connectionId,
      version: PLATFORM_IDENTITY_CONTRACT_VERSION,
    };
    this.records.set(identityId, updated);
    return { ...updated };
  }

  async delete(identityId: IdentityId): Promise<void> {
    if (!this.records.delete(identityId)) {
      throw new Error(`Identity not found: ${identityId}`);
    }
  }

  async clearPrimary(connectionId: ConnectionId): Promise<void> {
    for (const [id, record] of this.records.entries()) {
      if (record.connectionId === connectionId && record.isPrimary) {
        this.records.set(id, { ...record, isPrimary: false });
      }
    }
  }
}
