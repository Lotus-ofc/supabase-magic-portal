import type { PlatformIdentityV1 } from "../types";

export interface IdentityResolverPort {
  normalize(identities: readonly PlatformIdentityV1[]): readonly PlatformIdentityV1[];
}
