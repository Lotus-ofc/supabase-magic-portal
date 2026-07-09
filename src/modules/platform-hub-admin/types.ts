import type { PluginManifest } from "@/modules/platform-hub/ports";

export interface PlatformCatalogItemV1 {
  key: string;
  label: string;
  category: string;
  capabilities: string[];
  providers: string[];
  defaultProvider: string;
  apiVersions: Array<{ provider: string; apiVersion: string }>;
  oauthType: string | null;
  identityTypes: string[];
  connectionCount: number;
  avgHealthScore: number | null;
  manifest: PluginManifest;
}

export interface HubDiagnosticCheckV1 {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
}

export interface HubDiagnosticReportV1 {
  connectionId: string;
  ranAt: string;
  checks: HubDiagnosticCheckV1[];
  overall: "ok" | "warning" | "error";
}

export const MIGRATION_STAGES = [
  { id: "make_passive", label: "Make Passive", description: "Dados via Make (atual)" },
  { id: "parity", label: "Paridade", description: "Validação Hub × Make" },
  { id: "dual_run", label: "Dual Run", description: "Make + Hub em paralelo" },
  { id: "ready", label: "Ready", description: "Aprovado para cutover" },
  { id: "official_only", label: "Official Only", description: "Hub como origem" },
  { id: "make_off", label: "Make desligado", description: "Migração concluída" },
] as const;
