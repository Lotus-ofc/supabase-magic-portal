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

export function buildAuthInviteRedirectUrl(appUrl: string): string {
  return `${normalizeAppUrl(appUrl)}/auth`;
}
