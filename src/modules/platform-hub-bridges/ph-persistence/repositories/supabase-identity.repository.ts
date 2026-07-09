import type { SupabaseClient } from "@supabase/supabase-js";
import { PLATFORM_IDENTITY_CONTRACT_VERSION } from "../../../../../contracts/identity/platform-identity.v1";
import { asConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { IdentityRepositoryPort } from "@/modules/platform-hub/identity/ports/identity-repository.port";
import type { IdentityId } from "@/modules/platform-hub/identity/types/identity-id.v1";
import { asIdentityId } from "@/modules/platform-hub/identity/types/identity-id.v1";
import type { StoredPlatformIdentityV1 } from "@/modules/platform-hub/identity/types/stored-identity.v1";

type PhIdentityRow = {
  id: string;
  connection_id: string;
  identity_type: string;
  external_id: string;
  label: string;
  is_primary: boolean;
};

function toStored(row: PhIdentityRow): StoredPlatformIdentityV1 {
  return {
    version: PLATFORM_IDENTITY_CONTRACT_VERSION,
    identityId: asIdentityId(row.id),
    connectionId: asConnectionId(row.connection_id),
    identityType: row.identity_type as StoredPlatformIdentityV1["identityType"],
    externalId: row.external_id,
    label: row.label,
    isPrimary: row.is_primary,
  };
}

export class SupabaseIdentityRepository implements IdentityRepositoryPort {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(identity: StoredPlatformIdentityV1): Promise<StoredPlatformIdentityV1> {
    const { error } = await this.supabase.from("ph_identities").insert({
      id: identity.identityId,
      connection_id: identity.connectionId,
      identity_type: identity.identityType,
      external_id: identity.externalId,
      label: identity.label,
      is_primary: identity.isPrimary ?? false,
    });
    if (error) throw new Error(`ph_identities insert failed: ${error.message}`);
    return { ...identity };
  }

  async get(identityId: IdentityId): Promise<StoredPlatformIdentityV1 | null> {
    const { data, error } = await this.supabase
      .from("ph_identities")
      .select("id,connection_id,identity_type,external_id,label,is_primary")
      .eq("id", identityId)
      .maybeSingle();
    if (error) throw new Error(`ph_identities get failed: ${error.message}`);
    return data ? toStored(data as PhIdentityRow) : null;
  }

  async listByConnection(connectionId: ConnectionId): Promise<readonly StoredPlatformIdentityV1[]> {
    const { data, error } = await this.supabase
      .from("ph_identities")
      .select("id,connection_id,identity_type,external_id,label,is_primary")
      .eq("connection_id", connectionId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`ph_identities list failed: ${error.message}`);
    return (data ?? []).map((row) => toStored(row as PhIdentityRow));
  }

  async update(
    identityId: IdentityId,
    patch: Partial<StoredPlatformIdentityV1>,
  ): Promise<StoredPlatformIdentityV1> {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (patch.label !== undefined) updates.label = patch.label;
    if (patch.externalId !== undefined) updates.external_id = patch.externalId;
    if (patch.isPrimary !== undefined) updates.is_primary = patch.isPrimary;
    const { data, error } = await this.supabase
      .from("ph_identities")
      .update(updates)
      .eq("id", identityId)
      .select("id,connection_id,identity_type,external_id,label,is_primary")
      .single();
    if (error) throw new Error(`ph_identities update failed: ${error.message}`);
    return toStored(data as PhIdentityRow);
  }

  async delete(identityId: IdentityId): Promise<void> {
    const { error } = await this.supabase.from("ph_identities").delete().eq("id", identityId);
    if (error) throw new Error(`ph_identities delete failed: ${error.message}`);
  }

  async clearPrimary(connectionId: ConnectionId): Promise<void> {
    const { error } = await this.supabase
      .from("ph_identities")
      .update({ is_primary: false, updated_at: new Date().toISOString() })
      .eq("connection_id", connectionId)
      .eq("is_primary", true);
    if (error) throw new Error(`ph_identities clearPrimary failed: ${error.message}`);
  }
}
