/**
 * @contract PlatformIdentity v1.0.0
 * @see contracts/identity/contract.meta.json
 */

import type { ConnectionId } from "../connection/connection-id.v1";

export const PLATFORM_IDENTITY_CONTRACT_VERSION = "1.0.0" as const;

export type IdentityType = "ad_account" | "business" | "page" | "instagram" | "location" | string;

export interface PlatformIdentityV1 {
  readonly version: typeof PLATFORM_IDENTITY_CONTRACT_VERSION;
  connectionId: ConnectionId;
  identityType: IdentityType;
  externalId: string;
  label: string;
  isPrimary: boolean;
  metadata?: Record<string, unknown>;
}
