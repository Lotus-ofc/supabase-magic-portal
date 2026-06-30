import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthCallbackParams } from "./auth-callback";

export type AuthCallbackResult =
  | { ok: true; type: AuthCallbackParams["type"] }
  | { ok: false; message: string };

export async function completeAuthCallback(
  supabase: SupabaseClient,
  params: AuthCallbackParams,
): Promise<AuthCallbackResult> {
  if (params.error) {
    return {
      ok: false,
      message: params.error_description ?? params.error ?? "Link de autenticação inválido.",
    };
  }

  if (params.token_hash && params.type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: params.type,
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, type: params.type };
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) return { ok: false, message: error.message };
    return { ok: true, type: params.type };
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) return { ok: false, message: error.message };
  if (session) return { ok: true, type: params.type };

  return { ok: false, message: "Link de autenticação incompleto ou expirado." };
}
