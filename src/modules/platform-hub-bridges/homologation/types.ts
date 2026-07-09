import type { DualRunReportV1 } from "@/modules/platform-hub/plugins/_internal/dual-run/compare-metric-rows";

export type HomologationStatusV1 =
  | "validating"
  | "blocked"
  | "ready"
  | "official_ready"
  | "make_active"
  | "make_disabled"
  | "cutover_ready";

export type HomologationReportKindV1 =
  | "sync"
  | "comparison"
  | "coverage"
  | "health"
  | "provider"
  | "dual_run";

export interface HomologationReportV1 {
  id: string;
  connectionId: string;
  pluginKey: string;
  reportKind: HomologationReportKindV1;
  overall: string | null;
  coverage: number | null;
  payload: Record<string, unknown>;
  durationMs: number | null;
  rowsProduced: number;
  rowsIgnored: number;
  warnings: string[];
  createdAt: string;
}

export interface DebugTraceV1 {
  id: string;
  connectionId: string;
  pluginKey: string;
  operation: string;
  requestSummary: Record<string, unknown>;
  responseSummary: Record<string, unknown>;
  rateLimit: Record<string, unknown> | null;
  pagesFetched: number;
  rowsCollected: number;
  rowsDiscarded: number;
  retries: number;
  durationMs: number | null;
  createdAt: string;
}

export interface DualRunHomologationResultV1 {
  report: DualRunReportV1;
  coverage: number;
  overall: "ok" | "warning" | "error";
  makeRows: number;
  officialRows: number;
  durationMs: number;
  comparisonReportId?: string;
}

export interface RolloutDashboardRowV1 {
  connectionId: string;
  label: string;
  pluginKey: string;
  clienteNome: string | null;
  provider: string;
  homologationStatus: HomologationStatusV1;
  coverage: number | null;
  healthStatus: string;
  healthScore: number | null;
  lastSyncAt: string | null;
  lastComparisonAt: string | null;
  avgCollectMs: number | null;
  dualRunDays: number | null;
  lastDivergence: string | null;
}
