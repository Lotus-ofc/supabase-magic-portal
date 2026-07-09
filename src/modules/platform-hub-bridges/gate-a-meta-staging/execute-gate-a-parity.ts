import { randomUUID } from "node:crypto";
import {
  compareAgainstBaseline,
  createBaselineReader,
  fromWriterSnapshot,
  InMemoryBaselineMetricasQuery,
  SupabaseBaselineMetricasQuery,
} from "../base-metricas-reader";
import type { BaselineMetricasQueryPort } from "../base-metricas-reader";
import { applyGateAEnvOverrides, validateGateAConfig } from "./gate-a-config";
import { createGateAHubStack } from "./create-gate-a-hub";
import { createGateALogger } from "./logging/gate-a-logger";
import { exportGateAReport } from "./report/export-gate-a-report";
import {
  buildDivergenceSummary,
  buildGateACoverage,
  evaluateGateABlockers,
} from "./report/divergence-diagnostics";
import { patchOfficialMetaProvider, storeMetaAccessToken } from "./patch-official-meta-provider";
import type { GateAConfigV1, GateAParityRunResultV1 } from "./types";

export interface ExecuteGateAParityOptions {
  config: GateAConfigV1;
  /** Override baseline query (tests). Default: Supabase em live, memory em demo. */
  baselineQuery?: BaselineMetricasQueryPort;
  onLogLine?: (line: string) => void;
}

async function setupMetaConnection(
  hub: ReturnType<typeof createGateAHubStack>,
  config: GateAConfigV1,
): Promise<string> {
  const connection = await hub.connectionService.create({
    pluginKey: "meta_ads",
    label: `Gate A — ${config.pilot.label}`,
    scopeRef: hub.scopeRef,
    activeProviderType: "official_api",
  });

  hub.bridge.registerConnection(connection.connectionId, hub.scopeRef);

  if (config.meta.businessId) {
    await hub.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "business",
      externalId: config.meta.businessId,
      label: "Business",
    });
  }

  await hub.identityService.attach({
    connectionId: connection.connectionId,
    identityType: "ad_account",
    externalId: config.meta.adAccountId,
    label: "Ad Account (Gate A)",
    isPrimary: true,
  });

  if (config.meta.pageId) {
    await hub.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "page",
      externalId: config.meta.pageId,
      label: "Page",
    });
  }

  if (config.meta.instagramId) {
    await hub.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "instagram",
      externalId: config.meta.instagramId,
      label: "Instagram",
    });
  }

  const token = config.meta.accessToken?.trim();
  if (!token) {
    throw new Error(
      "Meta access token ausente. Defina meta.accessToken no config ou GATE_A_META_ACCESS_TOKEN no ambiente.",
    );
  }

  await storeMetaAccessToken(hub.credentialVault, connection.connectionId, token);
  return connection.connectionId;
}

function resolveBaselineQuery(
  config: GateAConfigV1,
  override?: BaselineMetricasQueryPort,
): BaselineMetricasQueryPort {
  if (override) return override;
  if (config.mode === "demo") {
    return new InMemoryBaselineMetricasQuery([]);
  }
  return new SupabaseBaselineMetricasQuery();
}

/**
 * Fluxo reproduzível Gate A:
 * Connection → Manual Sync → Official Provider → Runtime → Pipeline → Memory Writer
 * → Comparison → Baseline Reader → Coverage → Relatório
 */
export async function executeGateAParity(
  options: ExecuteGateAParityOptions,
): Promise<GateAParityRunResultV1> {
  const config = applyGateAEnvOverrides(validateGateAConfig(options.config));
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const logger = createGateALogger(options.onLogLine);
  const minCoverage = config.comparison?.minCoverage ?? 0.99;
  const tolerance = config.comparison?.tolerance ?? 0.0001;

  let connectionId = "";
  let baselineRowCount = 0;
  let producedRowCount = 0;

  try {
    logger.step("01_select_connection", {
      pilot: config.pilot.label,
      cliente: config.pilot.canonicalClientName,
      window: config.window,
      mode: config.mode,
    });

    const hub = createGateAHubStack(config);
    connectionId = await setupMetaConnection(hub, config);
    logger.complete("01_select_connection", { connectionId });

    logger.step("02_manual_sync_runtime", { connectionId });
    const syncResult = await hub.manualScheduler.run(connectionId);
    if (syncResult.status !== "success" || !syncResult.envelope) {
      throw new Error(syncResult.error ?? "Sync runtime failed without envelope");
    }
    logger.complete("02_manual_sync_runtime", {
      rowsCollected: syncResult.envelope.payload.rows.length,
      durationMs: syncResult.durationMs,
    });

    logger.step("03_metric_pipeline_memory_writer");
    const pipelineResult = await hub.metricPipeline.accept(syncResult.envelope);
    if (!pipelineResult.accepted) {
      throw new Error("Metric pipeline rejected envelope");
    }
    const producedSnapshot = hub.writer.snapshot();
    producedRowCount = producedSnapshot.length;
    logger.complete("03_metric_pipeline_memory_writer", {
      rowsWritten: pipelineResult.writerResults[0]?.rowsWritten ?? 0,
      snapshotRows: producedRowCount,
    });

    logger.step("04_baseline_reader");
    const baselineReader = createBaselineReader({
      queryPort: resolveBaselineQuery(config, options.baselineQuery),
      source: config.mode === "demo" ? "memory" : "supabase",
    });
    const baseline = await baselineReader.read({
      cliente: config.pilot.canonicalClientName,
      plataforma: "Meta Ads",
      from: config.window.from,
      to: config.window.to,
    });
    baselineRowCount = baseline.rows.length;
    logger.complete("04_baseline_reader", { baselineRowCount });

    logger.step("05_comparison");
    const comparison = await compareAgainstBaseline({
      baselineReader,
      filter: {
        cliente: config.pilot.canonicalClientName,
        plataforma: "Meta Ads",
        from: config.window.from,
        to: config.window.to,
      },
      produced: producedSnapshot,
      options: { minCoverage, tolerance },
    });
    logger.complete("05_comparison", { summary: comparison.summary });

    const producedRows = fromWriterSnapshot(producedSnapshot);
    const coverage = buildGateACoverage({
      window: config.window,
      baseline: baseline.rows,
      produced: producedRows,
      comparison,
    });
    const divergences = buildDivergenceSummary(comparison);
    const blockers = evaluateGateABlockers({
      comparison,
      coverage,
      divergences,
      minCoverage,
      mode: config.mode ?? "live",
    });

    const gateAPassed =
      comparison.compatible && blockers.filter((b) => !b.includes("modo demo")).length === 0;

    logger.step("06_export_report");
    const finishedAt = new Date().toISOString();
    const outputPaths = await exportGateAReport({
      runId,
      startedAt,
      finishedAt,
      config,
      connectionId,
      steps: logger.snapshot(),
      baselineRowCount,
      producedRowCount,
      comparison,
      coverage,
      divergences,
      gateAPassed,
      blockers,
    });
    logger.complete("06_export_report", outputPaths);

    return {
      runId,
      startedAt,
      finishedAt,
      config,
      connectionId,
      steps: logger.snapshot(),
      baselineRowCount,
      producedRowCount,
      comparison,
      coverage,
      divergences,
      gateAPassed,
      blockers,
      outputPaths,
    };
  } catch (error) {
    logger.fail("gate_a_parity", error);
    throw error;
  }
}

/** Re-export para testes que montam hub manualmente com MockHttpClient customizado. */
export {
  createGateAHubStack,
  patchOfficialMetaProvider,
  storeMetaAccessToken,
  validateGateAConfig,
};
