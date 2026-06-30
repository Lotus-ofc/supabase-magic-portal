import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthCallbackParams, AuthFlow } from "./auth-callback";
import { resolveCallbackFlow } from "./auth-callback";

export type AuthCallbackResult =
  | { ok: true; flow: AuthFlow; sessionEstablished: true }
  | { ok: false; message: string };

const AUTH_READY_POLL_MS = 50;
const AUTH_READY_MAX_MS = 8000;
const PASSWORD_RECOVERY_WAIT_MS = 1500;

function hasAuthSignalsInUrl(params: AuthCallbackParams): boolean {
  return Boolean(
    params.token_hash ||
    params.code ||
    params.error ||
    params.type ||
    (typeof window !== "undefined" && window.location.hash.includes("access_token")),
  );
}

/** Aguarda evento oficial PASSWORD_RECOVERY (disparado pelo SDK após link de recovery). */
export function waitForPasswordRecoveryEvent(
  supabase: SupabaseClient,
  timeoutMs = PASSWORD_RECOVERY_WAIT_MS,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => undefined;

    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(value);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") finish(true);
    });
    unsubscribe = () => sub.subscription.unsubscribe();

    setTimeout(() => finish(false), timeoutMs);
  });
}

/** Aguarda o SDK processar tokens implicit (#access_token) — padrão oficial Supabase. */
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
    if (session?.access_token && session.user?.id) return;
    await new Promise((r) => setTimeout(r, AUTH_READY_POLL_MS));
  }
}

export async function completeAuthCallback(
  supabase: SupabaseClient,
  params: AuthCallbackParams,
): Promise<AuthCallbackResult> {
  const recoveryPromise = waitForPasswordRecoveryEvent(supabase);

  if (params.error) {
    recoveryPromise.then(() => undefined);
    return {
      ok: false,
      message: params.error_description ?? params.error ?? "Link de autenticação inválido.",
    };
  }

  let redirectType: string | null = null;

  if (params.token_hash && params.type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.token_hash,
      type: params.type,
    });
    if (error) return { ok: false, message: error.message };
    if (params.type === "recovery") redirectType = "recovery";
  } else if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    redirectType = data?.redirectType ?? null;
    if (error) await waitForSessionAfterSdkInit(supabase, params);
  } else {
    await waitForSessionAfterSdkInit(supabase, params);
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) return { ok: false, message: error.message };
  if (!session?.access_token || !session.user?.id) {
    return {
      ok: false,
      message: "Sessão não estabelecida. O link pode ter expirado ou já foi utilizado.",
    };
  }

  const passwordRecovery = await recoveryPromise;
  let flow = resolveCallbackFlow(params.type, session, redirectType);
  if (passwordRecovery) flow = "recovery";

  return { ok: true, flow, sessionEstablished: true };
}
