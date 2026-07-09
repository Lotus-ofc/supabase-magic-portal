import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { IdentityId } from "../types/identity-id.v1";
import type {
  AttachIdentityInputV1,
  StoredPlatformIdentityV1,
  UpdateIdentityInputV1,
} from "../types/stored-identity.v1";

export interface IdentityServicePort {
  attach(input: AttachIdentityInputV1): Promise<StoredPlatformIdentityV1>;
  get(identityId: IdentityId): Promise<StoredPlatformIdentityV1>;
  list(connectionId: ConnectionId): Promise<readonly StoredPlatformIdentityV1[]>;
  update(identityId: IdentityId, patch: UpdateIdentityInputV1): Promise<StoredPlatformIdentityV1>;
  detach(identityId: IdentityId): Promise<void>;
  setPrimary(connectionId: ConnectionId, identityId: IdentityId): Promise<StoredPlatformIdentityV1>;
}
