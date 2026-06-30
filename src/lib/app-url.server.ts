/**
 * URL pública do portal — usada em convites Supabase Auth e links transacionais.
 * Somente servidor (nunca importar em código client-side).
 */
import { getRequestHeader } from "@tanstack/react-start/server";
import { buildAuthInviteRedirectUrl, isLocalhostUrl, normalizeAppUrl } from "./app-url";

function pick(...values: (string | undefined)[]): string | undefined {
  for (const v of values) {
    if (v && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function viteEnv(name: string): string | undefined {
  try {
    return (import.meta.env as Record<string, string | undefined>)[name];
  } catch {
    return undefined;
  }
}

function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Origem inferida do request HTTP atual (útil quando APP_URL não está no secret). */
export function getRequestOriginFromHeaders(): string | undefined {
  try {
    const forwardedHost = getRequestHeader("x-forwarded-host");
    const host = pick(forwardedHost, getRequestHeader("host"));
    if (!host) return undefined;

    const forwardedProto = getRequestHeader("x-forwarded-proto");
    const proto = (forwardedProto ?? (isLocalhostUrl(`http://${host}`) ? "http" : "https"))
      .split(",")[0]
      ?.trim();
    if (!proto) return undefined;

    return normalizeAppUrl(`${proto}://${host.split(",")[0]?.trim()}`);
  } catch {
    return undefined;
  }
}

/** URL base configurada explicitamente via env (sem barra final). */
export function getServerAppUrl(): string | undefined {
  const raw = pick(
    process.env.APP_URL,
    process.env.SITE_URL,
    process.env.VITE_APP_URL,
    process.env.PUBLIC_APP_URL,
    viteEnv("VITE_APP_URL"),
  );
  return raw ? normalizeAppUrl(raw) : undefined;
}

/**
 * Resolve a URL pública do portal para links de convite.
 * Prioridade: APP_URL → origem do request (produção) → erro claro.
 */
export function resolveServerAppUrl(): string {
  const fromEnv = getServerAppUrl();
  if (fromEnv) {
    if (isProductionRuntime() && isLocalhostUrl(fromEnv)) {
      throw new Error(
        "APP_URL aponta para localhost em produção. Configure a URL pública do portal (ex.: https://portal.suaempresa.com).",
      );
    }
    return fromEnv;
  }

  const fromRequest = getRequestOriginFromHeaders();
  if (fromRequest) {
    if (isProductionRuntime() && isLocalhostUrl(fromRequest)) {
      throw new Error(
        "Não foi possível determinar APP_URL em produção. Defina o secret APP_URL com a URL pública do portal.",
      );
    }
    return fromRequest;
  }

  throw new Error(
    "APP_URL não configurada. Defina a URL pública do portal nas variáveis de ambiente do servidor (ex.: https://portal.suaempresa.com).",
  );
}

/** Destino do botão nos e-mails de convite / recuperação de senha. */
export function resolveAuthInviteRedirectUrl(): string {
  return buildAuthInviteRedirectUrl(resolveServerAppUrl());
}

/** @deprecated Use resolveServerAppUrl */
export function requireServerAppUrl(): string {
  return resolveServerAppUrl();
}

/** @deprecated Use resolveAuthInviteRedirectUrl */
export function getAuthInviteRedirectUrl(): string {
  return resolveAuthInviteRedirectUrl();
}
