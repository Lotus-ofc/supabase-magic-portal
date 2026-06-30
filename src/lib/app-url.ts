/** Utilitários puros de URL do app (sem dependências de servidor). */

export function normalizeAppUrl(raw: string): string {
  const url = raw.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(url)) {
    throw new Error("APP_URL deve começar com http:// ou https://");
  }
  return url;
}

export function isLocalhostUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}

export function buildAuthCallbackUrl(appUrl: string): string {
  return `${normalizeAppUrl(appUrl)}/auth/callback`;
}

/** Callback com hint estável para recovery (sobrevive ao SDK limpar o hash). */
export function buildAuthRecoveryCallbackUrl(appUrl: string): string {
  return `${buildAuthCallbackUrl(appUrl)}?flow=recovery`;
}

/** @deprecated Prefer buildAuthCallbackUrl — mantido para compat temporária. */
export function buildAuthInviteRedirectUrl(appUrl: string): string {
  return buildAuthCallbackUrl(appUrl);
}
