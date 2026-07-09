import type { ComparisonReportV1 } from "../base-metricas-reader";
import type { BaselineMetricRowV1 } from "../base-metricas-reader/types";
import {
  GATE_A_CORE_METRICS,
  type GateACoreMetric,
  type GateACoverageV1,
  type GateADivergenceSummaryV1,
  type GateAWindowV1,
} from "../types";

function uniqueDates(rows: readonly BaselineMetricRowV1[]): string[] {
  return [...new Set(rows.map((row) => row.data))].sort();
}

function listDaysInWindow(window: GateAWindowV1): string[] {
  const days: string[] = [];
  let cursor = Date.parse(`${window.from}T00:00:00.000Z`);
  const end = Date.parse(`${window.to}T00:00:00.000Z`);
  while (cursor <= end) {
    days.push(new Date(cursor).toISOString().slice(0, 10));
    cursor += 86_400_000;
  }
  return days;
}

export function buildGateACoverage(input: {
  window: GateAWindowV1;
  baseline: readonly BaselineMetricRowV1[];
  produced: readonly BaselineMetricRowV1[];
  comparison: ComparisonReportV1;
}): GateACoverageV1 {
  const windowDays = listDaysInWindow(input.window);
  const baselineDates = new Set(uniqueDates(input.baseline));
  const producedDates = new Set(uniqueDates(input.produced));

  const coreMetrics = {} as GateACoverageV1["coreMetrics"];
  for (const metric of GATE_A_CORE_METRICS) {
    const baselineRows = input.baseline.filter((row) => row.metrica.toLowerCase() === metric);
    const matched = baselineRows.filter((row) => {
      const key = `${row.data}::${row.metrica}::${row.campanha ?? ""}`;
      return !input.comparison.missing.some(
        (missing) =>
          missing.data === row.data &&
          missing.metrica.toLowerCase() === metric &&
          (missing.campanha ?? "") === (row.campanha ?? ""),
      );
    }).length;
    coreMetrics[metric] = {
      baselineRows: baselineRows.length,
      matched,
      coverage: baselineRows.length === 0 ? 1 : matched / baselineRows.length,
    };
  }

  return {
    overall: input.comparison.coverage,
    coreMetrics,
    daysInWindow: windowDays.length,
    daysWithBaselineData: baselineDates.size,
    daysWithProducedData: producedDates.size,
    daysWithGaps: windowDays.filter((day) => !baselineDates.has(day) || !producedDates.has(day)),
  };
}

export function buildDivergenceSummary(comparison: ComparisonReportV1): GateADivergenceSummaryV1 {
  const coreMetricGaps: GateACoreMetric[] = [];
  for (const metric of GATE_A_CORE_METRICS) {
    const hasMissing = comparison.missing.some((row) => row.metrica.toLowerCase() === metric);
    if (hasMissing) coreMetricGaps.push(metric);
  }

  const topValueDeltas = [...comparison.valueDifferences]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 20)
    .map((diff) => ({
      key: diff.key,
      metrica: diff.row.metrica,
      data: diff.row.data,
      campanha: diff.row.campanha,
      baseline: diff.baseline,
      produced: diff.produced,
      delta: diff.delta,
    }));

  return {
    valueDifferences: comparison.valueDifferences.length,
    normalizationDifferences: comparison.normalizationDifferences.length,
    missingMetrics: comparison.missingMetrics,
    extraMetrics: comparison.extraMetrics,
    coreMetricGaps,
    topValueDeltas,
  };
}

export function evaluateGateABlockers(input: {
  comparison: ComparisonReportV1;
  coverage: GateACoverageV1;
  divergences: GateADivergenceSummaryV1;
  minCoverage: number;
  mode: "demo" | "live";
}): string[] {
  const blockers: string[] = [];

  if (input.comparison.coverage < input.minCoverage) {
    blockers.push(
      `Coverage ${(input.comparison.coverage * 100).toFixed(2)}% abaixo do mínimo ${(input.minCoverage * 100).toFixed(0)}%`,
    );
  }
  if (input.divergences.coreMetricGaps.length > 0) {
    blockers.push(`Métricas core ausentes: ${input.divergences.coreMetricGaps.join(", ")}`);
  }
  if (input.comparison.valueDifferences.length > 0) {
    blockers.push(
      `${input.comparison.valueDifferences.length} diferenças de valor fora da tolerância`,
    );
  }
  if (input.comparison.normalizationDifferences.length > 0) {
    blockers.push(
      `${input.comparison.normalizationDifferences.length} diferenças de normalização (alias/campanha)`,
    );
  }
  if (input.comparison.extraMetrics > 0) {
    blockers.push(
      `${input.comparison.extraMetrics} métricas extras não presentes no baseline Make`,
    );
  }
  if (input.coverage.daysInWindow < 7) {
    blockers.push(`Janela com menos de 7 dias (${input.coverage.daysInWindow})`);
  }
  if (input.coverage.daysWithGaps.length > 0) {
    blockers.push(
      `Buracos de data na janela: ${input.coverage.daysWithGaps.slice(0, 10).join(", ")}${input.coverage.daysWithGaps.length > 10 ? "…" : ""}`,
    );
  }
  if (input.mode === "demo") {
    blockers.push("Execução em modo demo — não substitui validação live com cliente real");
  }

  return blockers;
}
