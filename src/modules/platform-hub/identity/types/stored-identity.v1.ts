import type { PlatformIdentityV1 } from "../../../../../contracts/identity/platform-identity.v1";
import type { IdentityId } from "./identity-id.v1";

export type { IdentityId } from "./identity-id.v1";
export { asIdentityId, newIdentityId } from "./identity-id.v1";

export type {
  PlatformIdentityV1,
  IdentityType,
} from "../../../../../contracts/identity/platform-identity.v1";

export interface StoredPlatformIdentityV1 extends PlatformIdentityV1 {
  identityId: IdentityId;
}

export interface AttachIdentityInputV1 {
  connectionId: PlatformIdentityV1["connectionId"];
  identityType: PlatformIdentityV1["identityType"];
  externalId: string;
  label: string;
  isPrimary?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateIdentityInputV1 {
  label?: string;
  externalId?: string;
  metadata?: Record<string, unknown>;
}
