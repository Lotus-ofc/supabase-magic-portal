import type { AuthDiagnosticsReport } from "./auth-diagnostics";
import type { IntegrationDiagnostic } from "./integrations-diagnostics";
import type { InviteAuditEntry } from "./invite-audit";

export interface SystemDiagnosticsReport {
  diagnosed_at: string;
  auth: AuthDiagnosticsReport;
  production_checklist: {
    id: string;
    label: string;
    status: "ok" | "warn" | "error";
  }[];
  system_ready: boolean;
  supabase: {
    url: string | null;
    project_configured: boolean;
    anon_key_configured: boolean;
    service_role_configured: boolean;
    connection_ok: boolean;
    auth_ok: boolean;
    storage_ok: boolean | null;
    database_ok: boolean | null;
    realtime_ok: boolean | null;
    error: string | null;
  };
  environment: {
    node_env: string;
    build_mode: string;
    app_version: string;
  };
  integrations: IntegrationDiagnostic[];
  invite_audit: InviteAuditEntry[];
}
