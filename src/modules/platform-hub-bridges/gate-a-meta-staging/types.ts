import type { ComparisonReportV1 } from "../base-metricas-reader";

/** Métricas core exigidas pelo Gate A (rollout plan). */
export const GATE_A_CORE_METRICS = ["impressions", "reach", "clicks", "spend"] as const;

export type GateACoreMetric = (typeof GATE_A_CORE_METRICS)[number];

export interface GateAWindowV1 {
  from: string;
  to: string;
}

export interface GateAPilotV1 {
  label: string;
  cadastroId: number;
  /** Nome exato em base_metricas.cliente (Make). */
  canonicalClientName: string;
  scopeRef?: string;
}

export interface GateAMetaConnectionV1 {
  adAccountId: string;
  accessToken?: string;
  businessId?: string;
  pageId?: string;
  instagramId?: string;
  graphVersion?: string;
}

export interface GateAComparisonV1 {
  minCoverage?: number;
  tolerance?: number;
}

export interface GateAConfigV1 {
  pilot: GateAPilotV1;
  meta: GateAMetaConnectionV1;
  window: GateAWindowV1;
  comparison?: GateAComparisonV1;
  outputDir?: string;
  /** demo = MockHttpClient; live = FetchHttpClient + Meta Graph API */
  mode?: "demo" | "live";
}

export interface GateAStepLogV1 {
  step: string;
  status: "started" | "completed" | "failed" | "skipped";
  at: string;
  durationMs?: number;
  detail?: Record<string, unknown>;
  error?: string;
}

export interface GateACoverageV1 {
  overall: number;
  coreMetrics: Record<GateACoreMetric, { baselineRows: number; matched: number; coverage: number }>;
  daysInWindow: number;
  daysWithBaselineData: number;
  daysWithProducedData: number;
  daysWithGaps: string[];
}

export interface GateADivergenceSummaryV1 {
  valueDifferences: number;
  normalizationDifferences: number;
  missingMetrics: number;
  extraMetrics: number;
  coreMetricGaps: GateACoreMetric[];
  topValueDeltas: Array<{
    key: string;
    metrica: string;
    data: string;
    campanha: string;
    baseline: number;
    produced: number;
    delta: number;
  }>;
}

export interface GateAParityRunResultV1 {
  runId: string;
  startedAt: string;
  finishedAt: string;
  config: GateAConfigV1;
  connectionId: string;
  steps: GateAStepLogV1[];
  baselineRowCount: number;
  producedRowCount: number;
  comparison: ComparisonReportV1;
  coverage: GateACoverageV1;
  divergences: GateADivergenceSummaryV1;
  gateAPassed: boolean;
  blockers: string[];
  outputPaths: {
    directory: string;
    reportJson: string;
    summaryMarkdown: string;
    diffsCsv: string;
    structuredLog: string;
  };
}
