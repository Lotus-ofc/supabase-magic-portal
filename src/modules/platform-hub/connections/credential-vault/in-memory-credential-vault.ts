import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import {
  CREDENTIAL_VAULT_CONTRACT_VERSION,
  type CredentialKey,
  type CredentialPayloadV1,
  type CredentialVaultPortV1,
} from "../../../../../contracts/credential/credential-vault.v1";

function vaultKey(connectionId: ConnectionId, key: CredentialKey): string {
  return `${connectionId}::${key}`;
}

/** Implementação local in-memory — sem criptografia (Fase 4). */
export class InMemoryCredentialVault implements CredentialVaultPortV1 {
  private readonly secrets = new Map<string, CredentialPayloadV1>();

  async store(
    connectionId: ConnectionId,
    key: CredentialKey,
    payload: CredentialPayloadV1,
  ): Promise<void> {
    this.secrets.set(vaultKey(connectionId, key), {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { ...payload.data },
    });
  }

  async retrieve(
    connectionId: ConnectionId,
    key: CredentialKey,
  ): Promise<CredentialPayloadV1 | null> {
    const stored = this.secrets.get(vaultKey(connectionId, key));
    return stored ? { version: stored.version, data: { ...stored.data } } : null;
  }

  async delete(connectionId: ConnectionId, key: CredentialKey): Promise<void> {
    this.secrets.delete(vaultKey(connectionId, key));
  }

  async has(connectionId: ConnectionId, key: CredentialKey): Promise<boolean> {
    return this.secrets.has(vaultKey(connectionId, key));
  }
}
