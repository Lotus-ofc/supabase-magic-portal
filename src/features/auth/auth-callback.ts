export type AuthCallbackType = "invite" | "recovery" | "signup" | "email" | "magiclink";

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

export function buildCallbackForwardSearch(search: URLSearchParams): string {
  const params = new URLSearchParams();
  for (const key of ["token_hash", "type", "code", "error", "error_description"]) {
    const value = search.get(key);
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function resolvePostCallbackRedirect(type: AuthCallbackType | null): {
  view: "set-password" | "login";
  context?: "invite" | "recovery";
} {
  if (type === "invite" || type === "signup") {
    return { view: "set-password", context: "invite" };
  }
  if (type === "recovery") {
    return { view: "set-password", context: "recovery" };
  }
  return { view: "login" };
}
