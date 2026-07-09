import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { BaseMetricasRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";

export interface DualRunDiffRowV1 {
  key: string;
  baseline?: number;
  candidate?: number;
  delta?: number;
}

export interface DualRunReportV1 {
  comparedAt: string;
  baselineLabel: string;
  candidateLabel: string;
  totalBaselineRows: number;
  totalCandidateRows: number;
  matchedRows: number;
  missingInCandidate: number;
  missingInBaseline: number;
  valueMismatches: number;
  diffs: DualRunDiffRowV1[];
}

function rowKey(row: { date: string; metrica: string; campanha?: string | null }): string {
  return `${row.date}::${row.metrica}::${row.campanha ?? ""}`;
}

export function metricRowsToComparable(rows: readonly MetricRowV1[]): BaseMetricasRowV1[] {
  return rows.map((row) => ({
    data: row.date,
    metrica: row.metricKey,
    valor: row.value,
    campanha: row.campaign,
    cliente: "",
    plataforma: "",
  }));
}

/** Compara baseline (Make) vs candidate (Official) em formato long. */
export function compareMetricRowSets(
  baseline: readonly BaseMetricasRowV1[],
  candidate: readonly BaseMetricasRowV1[],
  labels: { baseline: string; candidate: string },
  tolerance = 0.0001,
): DualRunReportV1 {
  const baselineMap = new Map(baseline.map((row) => [rowKey(row), row.valor]));
  const candidateMap = new Map(candidate.map((row) => [rowKey(row), row.valor]));
  const allKeys = new Set([...baselineMap.keys(), ...candidateMap.keys()]);

  const diffs: DualRunDiffRowV1[] = [];
  let matchedRows = 0;
  let valueMismatches = 0;
  let missingInCandidate = 0;
  let missingInBaseline = 0;

  for (const key of allKeys) {
    const baseVal = baselineMap.get(key);
    const candVal = candidateMap.get(key);

    if (baseVal === undefined) {
      missingInBaseline += 1;
      diffs.push({ key, candidate: candVal });
      continue;
    }
    if (candVal === undefined) {
      missingInCandidate += 1;
      diffs.push({ key, baseline: baseVal });
      continue;
    }

    if (Math.abs(baseVal - candVal) <= tolerance) {
      matchedRows += 1;
    } else {
      valueMismatches += 1;
      diffs.push({ key, baseline: baseVal, candidate: candVal, delta: candVal - baseVal });
    }
  }

  return {
    comparedAt: new Date().toISOString(),
    baselineLabel: labels.baseline,
    candidateLabel: labels.candidate,
    totalBaselineRows: baseline.length,
    totalCandidateRows: candidate.length,
    matchedRows,
    missingInCandidate,
    missingInBaseline,
    valueMismatches,
    diffs,
  };
}
