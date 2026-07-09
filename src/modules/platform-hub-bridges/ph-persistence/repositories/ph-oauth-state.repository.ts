import type { SupabaseClient } from "@supabase/supabase-js";

export interface PhOAuthStateV1 {
  state: string;
  connectionId: string;
  pluginKey: string;
  redirectAfter: string;
  expiresAt: string;
}

export class PhOAuthStateRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(
    input: Omit<PhOAuthStateV1, "expiresAt"> & { ttlMinutes?: number },
  ): Promise<PhOAuthStateV1> {
    const expiresAt = new Date(Date.now() + (input.ttlMinutes ?? 15) * 60_000).toISOString();
    const row = {
      state: input.state,
      connection_id: input.connectionId,
      plugin_key: input.pluginKey,
      redirect_after: input.redirectAfter,
      expires_at: expiresAt,
    };
    const { error } = await this.supabase.from("ph_oauth_states").insert(row);
    if (error) throw new Error(`ph_oauth_states insert failed: ${error.message}`);
    return {
      state: input.state,
      connectionId: input.connectionId,
      pluginKey: input.pluginKey,
      redirectAfter: input.redirectAfter,
      expiresAt,
    };
  }

  async consume(state: string): Promise<PhOAuthStateV1 | null> {
    const { data, error } = await this.supabase
      .from("ph_oauth_states")
      .select("state,connection_id,plugin_key,redirect_after,expires_at")
      .eq("state", state)
      .maybeSingle();
    if (error) throw new Error(`ph_oauth_states get failed: ${error.message}`);
    if (!data) return null;
    if (new Date(data.expires_at as string).getTime() < Date.now()) {
      await this.supabase.from("ph_oauth_states").delete().eq("state", state);
      return null;
    }
    await this.supabase.from("ph_oauth_states").delete().eq("state", state);
    return {
      state: data.state as string,
      connectionId: data.connection_id as string,
      pluginKey: data.plugin_key as string,
      redirectAfter: data.redirect_after as string,
      expiresAt: data.expires_at as string,
    };
  }
}
