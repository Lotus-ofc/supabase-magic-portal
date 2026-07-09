import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import {
  CREDENTIAL_VAULT_CONTRACT_VERSION,
  type CredentialKey,
  type CredentialPayloadV1,
  type CredentialVaultPortV1,
} from "../../../../../contracts/credential/credential-vault.v1";
import { decryptCredentialPayload, encryptCredentialPayload } from "../credential-crypto";

/** Credential vault persistido em ph_credentials — bridge only. */
export class SupabaseCredentialVault implements CredentialVaultPortV1 {
  constructor(private readonly supabase: SupabaseClient) {}

  async store(
    connectionId: ConnectionId,
    key: CredentialKey,
    payload: CredentialPayloadV1,
  ): Promise<void> {
    const encrypted = encryptCredentialPayload({
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { ...payload.data },
    });
    const { error } = await this.supabase.from("ph_credentials").upsert(
      {
        connection_id: connectionId,
        credential_key: key,
        payload_encrypted: encrypted,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "connection_id,credential_key" },
    );
    if (error) throw new Error(`ph_credentials store failed: ${error.message}`);
  }

  async retrieve(
    connectionId: ConnectionId,
    key: CredentialKey,
  ): Promise<CredentialPayloadV1 | null> {
    const { data, error } = await this.supabase
      .from("ph_credentials")
      .select("payload_encrypted")
      .eq("connection_id", connectionId)
      .eq("credential_key", key)
      .maybeSingle();
    if (error) throw new Error(`ph_credentials retrieve failed: ${error.message}`);
    if (!data?.payload_encrypted) return null;
    return decryptCredentialPayload(data.payload_encrypted as string);
  }

  async delete(connectionId: ConnectionId, key: CredentialKey): Promise<void> {
    const { error } = await this.supabase
      .from("ph_credentials")
      .delete()
      .eq("connection_id", connectionId)
      .eq("credential_key", key);
    if (error) throw new Error(`ph_credentials delete failed: ${error.message}`);
  }

  async has(connectionId: ConnectionId, key: CredentialKey): Promise<boolean> {
    const { count, error } = await this.supabase
      .from("ph_credentials")
      .select("credential_key", { count: "exact", head: true })
      .eq("connection_id", connectionId)
      .eq("credential_key", key);
    if (error) throw new Error(`ph_credentials has failed: ${error.message}`);
    return (count ?? 0) > 0;
  }
}
