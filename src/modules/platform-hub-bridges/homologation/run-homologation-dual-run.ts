import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { Capability } from "../../../../contracts/plugin/capability.v1";
import { isMetricsTimeseriesEnvelope } from "../../../../contracts/ingest/ingest-envelope.v1";
import { compareMetrics } from "@/modules/platform-hub-bridges/base-metricas-reader";
import { collectIngestEnvelope } from "@/modules/platform-hub/plugins/_internal/provider-framework/collect-ingest-envelope";
import type { AdminHubStack } from "@/modules/platform-hub-bridges/ph-persistence";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PhHomologationRepository } from "./repositories/ph-homologation.repository";
import { PhComparisonRepository } from "./repositories/ph-comparison.repository";
import { readHubMetricas, readMakeMetricas } from "./parallel-metricas-reader";
import type { DualRunHomologationResultV1 } from "./types";

const PLATFORM_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  ga4: "GA4",
  google_business: "Google Business",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export interface HomologationDualRunOptions {
  /** Persistir envelope coletado em base_metricas_hub via MetricPipeline. */
  persistToHub?: boolean;
  /** Persistir relatório estruturado em ph_comparison_reports. */
  persistComparison?: boolean;
}

/** Homologation Mode — coleta official + grava hub + compara make × hub. */
export async function runHomologationDualRun(
  stack: AdminHubStack,
  supabase: SupabaseClient,
  connectionId: string,
  window?: { from: string; to: string },
  options: HomologationDualRunOptions = { persistToHub: true, persistComparison: true },
): Promise<DualRunHomologationResultV1> {
  const homologationRepo = new PhHomologationRepository(supabase);
  const comparisonRepo = new PhComparisonRepository(supabase);
  const id = asConnectionId(connectionId);
  const started = Date.now();

  const conn = await stack.connectionService.get(id);
  const adminRow = await stack.adminQueries.getConnection(connectionId);
  const identities = await stack.identityService.list(id);
  const registration = stack.registry.getPlugin(conn.pluginKey);
  const capability = registration.manifest.capabilities[0] as Capability;

  const officialProvider = registration.adapter.getProvider("official_api");
  const today = new Date().toISOString().slice(0, 10);
  const collectWindow = window ?? { from: today, to: today };

  const officialEnvelope = await collectIngestEnvelope({
    resolver: stack.resolver,
    provider: officialProvider,
    connectionId: id,
    capability,
    identities,
    window: collectWindow,
  });

  let writerRows = 0;
  if (options.persistToHub !== false && isMetricsTimeseriesEnvelope(officialEnvelope)) {
    const pipelineResult = await stack.metricPipeline.accept(officialEnvelope);
    writerRows = pipelineResult.writerResults.reduce((sum, r) => sum + r.rowsWritten, 0);
    await homologationRepo.saveReport({
      connectionId,
      pluginKey: conn.pluginKey,
      reportKind: "sync",
      overall: pipelineResult.accepted ? "ok" : "error",
      payload: { writerTarget: "HUB", rowsWritten: writerRows },
      rowsProduced: writerRows,
    });
  }

  const clienteNome = adminRow?.clienteNome ?? "";
  const plataforma = PLATFORM_LABELS[conn.pluginKey] ?? registration.manifest.label;
  const filter = {
    cliente: clienteNome,
    plataforma,
    from: collectWindow.from,
    to: collectWindow.to,
  };

  const [makeRows, hubRows] = await Promise.all([
    readMakeMetricas(supabase, filter),
    readHubMetricas(supabase, filter),
  ]);

  const comparison = compareMetrics(makeRows, hubRows);
  const coverage = comparison.coverage;
  const overall = comparison.compatible
    ? "ok"
    : comparison.valueDifferences.length > 0
      ? "error"
      : "warning";

  const durationMs = Date.now() - started;

  await homologationRepo.saveDebugTrace({
    connectionId,
    pluginKey: conn.pluginKey,
    operation: "dual_run_collect",
    requestSummary: { window: collectWindow, capability, writerTarget: "HUB" },
    responseSummary: {
      rowsMake: makeRows.length,
      rowsHub: hubRows.length,
      writerRows,
      profile: officialEnvelope.profile,
    },
    rowsCollected: hubRows.length,
    durationMs,
  });

  await homologationRepo.saveReport({
    connectionId,
    pluginKey: conn.pluginKey,
    reportKind: "dual_run",
    overall,
    coverage,
    payload: {
      comparison,
      window: collectWindow,
      rowsMake: makeRows.length,
      rowsHub: hubRows.length,
    },
    durationMs,
    rowsProduced: hubRows.length,
    warnings: comparison.normalizationDifferences.map((d) => d.detail),
  });

  await homologationRepo.saveReport({
    connectionId,
    pluginKey: conn.pluginKey,
    reportKind: "coverage",
    overall,
    coverage,
    payload: { matched: comparison.matchedMetrics, missing: comparison.missingMetrics },
    durationMs,
  });

  let comparisonReportId: string | undefined;
  if (options.persistComparison !== false) {
    const saved = await comparisonRepo.saveComparison({
      connectionId,
      pluginKey: conn.pluginKey,
      fromDate: collectWindow.from,
      toDate: collectWindow.to,
      comparison,
      rowsMake: makeRows.length,
      rowsHub: hubRows.length,
      durationMs,
      status: overall,
      summary: comparison.summary,
    });
    comparisonReportId = saved.id;
  }

  await homologationRepo.updateHomologationFields(connectionId, {
    lastComparisonAt: new Date().toISOString(),
    lastCoverage: coverage,
    avgCollectMs: durationMs,
    homologationStatus: overall === "ok" ? "validating" : "blocked",
    dualRunStartedAt: adminRow?.lastSyncAt ?? new Date().toISOString(),
  });

  return {
    report: {
      comparedAt: comparison.comparedAt,
      baselineLabel: "base_metricas_make",
      candidateLabel: "base_metricas_hub",
      totalBaselineRows: makeRows.length,
      totalCandidateRows: hubRows.length,
      matchedRows: comparison.matchedMetrics,
      missingInCandidate: comparison.missingMetrics,
      missingInBaseline: comparison.extraMetrics,
      valueMismatches: comparison.valueDifferences.length,
      diffs: comparison.valueDifferences.map((d) => ({
        key: d.key,
        baseline: d.baseline,
        candidate: d.produced,
        delta: d.delta,
      })),
    },
    coverage,
    overall,
    makeRows: makeRows.length,
    officialRows: hubRows.length,
    durationMs,
    comparisonReportId,
  };
}
