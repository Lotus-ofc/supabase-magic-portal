import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { IdentityId } from "../types/identity-id.v1";
import type { StoredPlatformIdentityV1 } from "../types/stored-identity.v1";

export interface IdentityRepositoryPort {
  create(identity: StoredPlatformIdentityV1): Promise<StoredPlatformIdentityV1>;
  get(identityId: IdentityId): Promise<StoredPlatformIdentityV1 | null>;
  listByConnection(connectionId: ConnectionId): Promise<readonly StoredPlatformIdentityV1[]>;
  update(
    identityId: IdentityId,
    patch: Partial<StoredPlatformIdentityV1>,
  ): Promise<StoredPlatformIdentityV1>;
  delete(identityId: IdentityId): Promise<void>;
  clearPrimary(connectionId: ConnectionId): Promise<void>;
}
