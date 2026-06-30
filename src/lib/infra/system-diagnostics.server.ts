/**
 * Montagem server-side do diagnóstico de auth e sistema.
 * Somente servidor.
 */
import {
  getServerSupabaseAnonKey,
  getServerSupabaseServiceRoleKey,
  getServerSupabaseUrl,
  requireServerSupabaseAnonConfig,
} from "@/integrations/supabase/env.server";
import { getRequestOriginFromHeaders, getServerAppUrl } from "@/lib/app-url.server";
import {
  buildAuthDiagnostics,
  buildProductionChecklist,
  type AuthDiagnosticsReport,
  type DiagnosticCheck,
} from "./auth-diagnostics";
import { getInviteAuditLog } from "./invite-audit";
import {
  buildIntegrationDiagnostics,
  type IntegrationDiagnostic,
} from "./integrations-diagnostics";
import type { SystemDiagnosticsReport } from "./system-diagnostics.types";

export type { SystemDiagnosticsReport };

function pickEnv(...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (v?.trim()) return v.trim();
  }
  return undefined;
}

export async function evaluateAuthDiagnostics(
  clientOrigin?: string | null,
): Promise<AuthDiagnosticsReport> {
  const appUrlConfigured = getServerAppUrl() ?? null;
  const requestOrigin = getRequestOriginFromHeaders() ?? null;
  const currentDomain = clientOrigin ?? requestOrigin;

  let supabaseClientReady = false;
  let supabaseAuthAvailable = false;
  try {
    requireServerSupabaseAnonConfig();
    supabaseClientReady = true;
    supabaseAuthAvailable = true;
  } catch {
    supabaseClientReady = false;
    supabaseAuthAvailable = false;
  }

  return buildAuthDiagnostics({
    appUrlConfigured,
    currentDomain,
    nodeEnv: process.env.NODE_ENV,
    productionUrl: pickEnv("OFFICIAL_PRODUCTION_APP_URL", "PRODUCTION_APP_URL"),
    stagingUrl: pickEnv("STAGING_APP_URL"),
    supabaseClientReady,
    supabaseAuthAvailable,
    smtpManagedBySupabase: supabaseClientReady,
  });
}

export async function evaluateSystemDiagnostics(
  clientOrigin?: string | null,
  platformCounts?: { plataforma: string; total: number }[],
): Promise<SystemDiagnosticsReport> {
  const auth = await evaluateAuthDiagnostics(clientOrigin);
  const url = getServerSupabaseUrl() ?? null;
  const anonOk = !!getServerSupabaseAnonKey();
  const serviceOk = !!getServerSupabaseServiceRoleKey();

  let connectionOk = false;
  let authOk = false;
  let databaseOk: boolean | null = null;
  let storageOk: boolean | null = null;
  let supabaseError: string | null = null;

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin;
    const { error: dbError } = await admin
      .from("base_metricas")
      .select("*", { count: "exact", head: true });
    connectionOk = !dbError;
    databaseOk = !dbError;
    if (dbError) supabaseError = dbError.message;

    const { error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    authOk = !authError;
    if (authError && !supabaseError) supabaseError = authError.message;

    const { error: storageError } = await admin.storage.listBuckets();
    storageOk = !storageError;
  } catch (e) {
    supabaseError = e instanceof Error ? e.message : String(e);
  }

  const integrations = buildIntegrationDiagnostics(platformCounts ?? []);
  const integrationsOk = integrations.some((i) => i.status === "ok");

  const checklist = buildProductionChecklist(auth, {
    database_ok: databaseOk ?? undefined,
    storage_ok: storageOk ?? undefined,
    integrations_ok: integrationsOk,
  });

  const systemReady =
    auth.production_ready && checklist.every((c) => c.status !== "error") && connectionOk && authOk;

  return {
    diagnosed_at: new Date().toISOString(),
    auth,
    production_checklist: checklist,
    system_ready: systemReady,
    supabase: {
      url,
      project_configured: !!url,
      anon_key_configured: anonOk,
      service_role_configured: serviceOk,
      connection_ok: connectionOk,
      auth_ok: authOk,
      storage_ok: storageOk,
      database_ok: databaseOk,
      realtime_ok: null,
      error: supabaseError,
    },
    environment: {
      node_env: process.env.NODE_ENV ?? "development",
      build_mode: process.env.NODE_ENV === "production" ? "production" : "development",
      app_version: pickEnv("npm_package_version") ?? "0.0.0",
    },
    integrations,
    invite_audit: getInviteAuditLog(30),
  };
}

export function assertInvitesAllowed(report: AuthDiagnosticsReport): void {
  if (report.invites_allowed) return;
  throw new Error(
    report.block_invites_reason ??
      report.message ??
      "Configuração de autenticação inválida para envio de convites.",
  );
}

/** Agrupa checks para exibição em cards. */
export function groupChecks(checks: DiagnosticCheck[]): Record<string, DiagnosticCheck[]> {
  const groups: Record<string, DiagnosticCheck[]> = {
    url: [],
    auth: [],
    supabase: [],
  };
  for (const c of checks) {
    if (
      [
        "app_url",
        "current_domain",
        "environment",
        "app_url_expected",
        "domain_match",
        "site_url",
      ].includes(c.id)
    ) {
      groups.url.push(c);
    } else if (c.id.includes("redirect") || c.id === "invites_enabled") {
      groups.auth.push(c);
    } else {
      groups.supabase.push(c);
    }
  }
  return groups;
}
