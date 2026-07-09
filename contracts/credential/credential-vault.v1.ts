/**
 * @contract CredentialVault v1.0.0
 * @see contracts/credential/contract.meta.json
 *
 * Armazenamento opaco de credenciais por ConnectionId.
 * Implementações: in-memory (F4), criptografado (futuro).
 */

import type { ConnectionId } from "../connection/connection-id.v1";

export const CREDENTIAL_VAULT_CONTRACT_VERSION = "1.0.0" as const;

export type CredentialKey = string & { readonly __brand: "CredentialKey" };

export function asCredentialKey(value: string): CredentialKey {
  return value as CredentialKey;
}

export interface CredentialPayloadV1 {
  readonly version: typeof CREDENTIAL_VAULT_CONTRACT_VERSION;
  data: Record<string, unknown>;
}

export interface CredentialVaultPortV1 {
  store(
    connectionId: ConnectionId,
    key: CredentialKey,
    payload: CredentialPayloadV1,
  ): Promise<void>;
  retrieve(connectionId: ConnectionId, key: CredentialKey): Promise<CredentialPayloadV1 | null>;
  delete(connectionId: ConnectionId, key: CredentialKey): Promise<void>;
  has(connectionId: ConnectionId, key: CredentialKey): Promise<boolean>;
}
