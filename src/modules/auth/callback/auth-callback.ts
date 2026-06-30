import type { Session } from "@supabase/supabase-js";

export type AuthCallbackType = "invite" | "recovery" | "signup" | "email" | "magiclink";

/** Fluxos de autenticação suportados pelo portal. */
export type AuthFlow = "invite" | "recovery" | "login";

export interface AuthCallbackParams {
  token_hash: string | null;
  type: AuthCallbackType | null;
  code: string | null;
  error: string | null;
  error_description: string | null;
}

const CALLBACK_TYPES = new Set<string>(["invite", "recovery", "signup", "email", "magiclink"]);

export function parseAuthCallbackParams(
  search: URLSearchParams,
  hash: URLSearchParams,
): AuthCallbackParams {
  const token_hash = search.get("token_hash") ?? hash.get("token_hash");
  const rawType = search.get("type") ?? hash.get("type");
  const type = rawType && CALLBACK_TYPES.has(rawType) ? (rawType as AuthCallbackType) : null;
  const code = search.get("code") ?? hash.get("code");
  const error = search.get("error") ?? hash.get("error");
  const error_description = search.get("error_description") ?? hash.get("error_description");

  return { token_hash, type, code, error, error_description };
}

export function hasLegacyAuthTokensOnAuthRoute(search: URLSearchParams): boolean {
  return (
    search.has("token_hash") || search.has("code") || search.has("type") || search.has("error")
  );
}

/**
 * Resolve fluxo pós-callback usando sinais oficiais do Supabase:
 * - `type` na URL (query ou hash)
 * - `redirectType` retornado por exchangeCodeForSession (PKCE recovery)
 * - `invited_at` no usuário quando o SDK consome o hash implicit
 */
export function resolveCallbackFlow(
  type: AuthCallbackType | null,
  session: Session,
  redirectType?: string | null,
): AuthFlow {
  if (type === "recovery" || redirectType === "recovery") return "recovery";
  if (type === "invite" || type === "signup") return "invite";
  if (session.user.invited_at) return "invite";
  return "login";
}

export function resolvePostCallbackRedirect(flow: AuthFlow): {
  view: "set-password" | "login";
  context?: "invite" | "recovery";
} {
  if (flow === "invite") return { view: "set-password", context: "invite" };
  if (flow === "recovery") return { view: "set-password", context: "recovery" };
  return { view: "login" };
}
