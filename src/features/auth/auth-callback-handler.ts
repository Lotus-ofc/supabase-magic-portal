import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthCallbackParams } from "./auth-callback";
import {
  hasValidAuthSession,
  inferAuthFlowFromSession,
  type InferredAuthFlow,
} from "./auth-callback-inference";

export type AuthCallbackResult =
  | { ok: true; flow: InferredAuthFlow; sessionEstablished: true }
  | { ok: false; message: string };

const AUTH_READY_POLL_MS = 50;
const AUTH_READY_MAX_MS = 8000;

function hasAuthSignalsInUrl(params: AuthCallbackParams): boolean {
  return Boolean(
    params.token_hash ||
    params.code ||
    params.error ||
    params.type ||
    (typeof window !== "undefined" && window.location.hash.includes("access_token")),
  );
}

async function waitForSessionAfterSdkInit(
  supabase: SupabaseClient,
  params: AuthCallbackParams,
): Promise<void> {
  if (!hasAuthSignalsInUrl(params)) return;

  const deadline = Date.now() + AUTH_READY_MAX_MS;
  while (Date.now() < deadline) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (hasValidAuthSession(session)) return;
    await new Promise((r) => setTimeout(r, AUTH_READY_POLL_MS));
  }
}

async function requireSession(supabase: SupabaseClient): Promise<
  | {
      session: NonNullable<
        Awaited<ReturnType<SupabaseClient["auth"]["getSession"]>>["data"]["session"]
      >;
    }
  | { error: string }
> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) return { error: error.message };
  if (!hasValidAuthSession(session)) {
    return { error: "Sessão não estabelecida. O link pode ter expirado ou já foi utilizado." };
  }
  return { session };
}

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

  const urlTypeHint = params.type;

  if (params.token_hash && params.type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: params.type,
    });
    if (error) return { ok: false, message: error.message };
  } else if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      await waitForSessionAfterSdkInit(supabase, params);
    }
  } else {
    await waitForSessionAfterSdkInit(supabase, params);
  }

  const sessionResult = await requireSession(supabase);
  if ("error" in sessionResult) {
    return { ok: false, message: sessionResult.error };
  }

  const flow = inferAuthFlowFromSession(sessionResult.session, urlTypeHint, params.flow_hint);
  return { ok: true, flow, sessionEstablished: true };
}
