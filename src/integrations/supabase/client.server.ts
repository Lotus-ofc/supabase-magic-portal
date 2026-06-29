// SERVER-ONLY admin client para o projeto OFICIAL (ywvhoctcmibjitvwkkhb).
// Lazy init — não quebra dev quando service-role não está no .env.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerSupabaseServiceRoleKey, getServerSupabaseUrl } from "./env.server";

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const url = getServerSupabaseUrl();
  const serviceRole = getServerSupabaseServiceRoleKey();

  if (!url || !serviceRole) {
    throw new Error(
      "Missing OFFICIAL_SUPABASE_URL / OFFICIAL_SERVICE_ROLE_KEY for admin client",
    );
  }

  _client = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

/** @deprecated Prefer getSupabaseAdmin() — lazy and safe when service-role is absent. */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
