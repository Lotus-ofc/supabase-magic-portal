import type { BaselineMetricRowV1 } from "./types";
import {
  baselineRowKey,
  metricAliasCanonical,
  normalizeCampaign,
  platformAliasCanonical,
} from "./mapping";

export interface MetricValueDifferenceV1 {
  key: string;
  baseline: number;
  produced: number;
  delta: number;
  row: {
    cliente: string;
    plataforma: string;
    data: string;
    metrica: string;
    campanha: string;
  };
}

export interface NormalizationDifferenceV1 {
  kind: "metric_alias" | "platform_alias" | "campaign_whitespace" | "period_mismatch";
  baselineKey: string;
  producedKey: string;
  detail: string;
}

export interface ComparisonReportV1 {
  compatible: boolean;
  coverage: number;
  matchedMetrics: number;
  missingMetrics: number;
  extraMetrics: number;
  valueDifferences: readonly MetricValueDifferenceV1[];
  normalizationDifferences: readonly NormalizationDifferenceV1[];
  missing: readonly BaselineMetricRowV1[];
  extra: readonly BaselineMetricRowV1[];
  summary: string;
  comparedAt: string;
}

export interface CompareMetricsOptions {
  /** Tolerância absoluta de valor (default 0.0001). */
  tolerance?: number;
  /** Cobertura mínima para `compatible=true` (default 1.0 = 100%). */
  minCoverage?: number;
  /** Aceitar diferenças de valor zero? default true exigem valueDifferences vazias. */
  allowValueDifferences?: boolean;
}

function parseKey(key: string): MetricValueDifferenceV1["row"] {
  const [cliente = "", plataforma = "", data = "", metrica = "", campanha = ""] = key.split("::");
  return { cliente, plataforma, data, metrica, campanha };
}

function findAliasMatch(
  produced: BaselineMetricRowV1,
  remainingBaseline: Map<string, BaselineMetricRowV1>,
): { key: string; kind: NormalizationDifferenceV1["kind"]; detail: string } | null {
  for (const [baseKey, baseRow] of remainingBaseline) {
    if (baseRow.cliente !== produced.cliente) continue;
    if (baseRow.data !== produced.data) continue;

    const campaignMatch =
      normalizeCampaign(baseRow.campanha) === normalizeCampaign(produced.campanha);
    const metricExact = baseRow.metrica.toLowerCase() === produced.metrica.toLowerCase();
    const metricAlias =
      metricAliasCanonical(baseRow.metrica) === metricAliasCanonical(produced.metrica);
    const platformExact = baseRow.plataforma === produced.plataforma;
    const platformAlias =
      platformAliasCanonical(baseRow.plataforma) === platformAliasCanonical(produced.plataforma);

    if (campaignMatch && metricAlias && !metricExact && platformExact) {
      return {
        key: baseKey,
        kind: "metric_alias",
        detail: `metrica baseline="${baseRow.metrica}" produced="${produced.metrica}"`,
      };
    }

    if (campaignMatch && metricExact && platformAlias && !platformExact) {
      return {
        key: baseKey,
        kind: "platform_alias",
        detail: `plataforma baseline="${baseRow.plataforma}" produced="${produced.plataforma}"`,
      };
    }

    if (
      metricExact &&
      platformExact &&
      !campaignMatch &&
      normalizeCampaign(baseRow.campanha).toLowerCase() ===
        normalizeCampaign(produced.campanha).toLowerCase()
    ) {
      return {
        key: baseKey,
        kind: "campaign_whitespace",
        detail: `campanha baseline="${baseRow.campanha ?? ""}" produced="${produced.campanha ?? ""}"`,
      };
    }
  }

  return null;
}

/**
 * Compara baseline (Make / base_metricas) vs produced (MetricPipeline writer snapshot).
 * Não conhece Provider, Runtime nem OAuth — apenas duas coleções de métricas.
 */
export function compareMetrics(
  baseline: readonly BaselineMetricRowV1[],
  produced: readonly BaselineMetricRowV1[],
  options: CompareMetricsOptions = {},
): ComparisonReportV1 {
  const tolerance = options.tolerance ?? 0.0001;
  const minCoverage = options.minCoverage ?? 1;
  const allowValueDifferences = options.allowValueDifferences ?? false;

  const baselineMap = new Map(baseline.map((row) => [baselineRowKey(row), row]));
  const producedMap = new Map(produced.map((row) => [baselineRowKey(row), row]));

  const remainingBaseline = new Map(baselineMap);
  const remainingProduced = new Map(producedMap);

  const valueDifferences: MetricValueDifferenceV1[] = [];
  const normalizationDifferences: NormalizationDifferenceV1[] = [];
  let matchedMetrics = 0;

  for (const [key, baseRow] of baselineMap) {
    const producedRow = producedMap.get(key);
    if (!producedRow) continue;

    remainingBaseline.delete(key);
    remainingProduced.delete(key);

    if (Math.abs(baseRow.valor - producedRow.valor) <= tolerance) {
      matchedMetrics += 1;
    } else {
      valueDifferences.push({
        key,
        baseline: baseRow.valor,
        produced: producedRow.valor,
        delta: producedRow.valor - baseRow.valor,
        row: parseKey(key),
      });
    }
  }

  for (const [producedKey, producedRow] of [...remainingProduced]) {
    const alias = findAliasMatch(producedRow, remainingBaseline);
    if (!alias) continue;

    const baseRow = remainingBaseline.get(alias.key)!;
    remainingBaseline.delete(alias.key);
    remainingProduced.delete(producedKey);

    normalizationDifferences.push({
      kind: alias.kind,
      baselineKey: alias.key,
      producedKey,
      detail: alias.detail,
    });

    if (Math.abs(baseRow.valor - producedRow.valor) <= tolerance) {
      matchedMetrics += 1;
    } else {
      valueDifferences.push({
        key: `${alias.key}|${producedKey}`,
        baseline: baseRow.valor,
        produced: producedRow.valor,
        delta: producedRow.valor - baseRow.valor,
        row: parseKey(alias.key),
      });
    }
  }

  const missing = [...remainingBaseline.values()];
  const extra = [...remainingProduced.values()];
  const denominator = Math.max(baseline.length, 1);
  const coverage = matchedMetrics / denominator;

  const compatible =
    coverage >= minCoverage &&
    missing.length === 0 &&
    extra.length === 0 &&
    normalizationDifferences.length === 0 &&
    (allowValueDifferences || valueDifferences.length === 0);

  const summary = [
    `coverage=${(coverage * 100).toFixed(1)}%`,
    `matched=${matchedMetrics}`,
    `missing=${missing.length}`,
    `extra=${extra.length}`,
    `valueDiffs=${valueDifferences.length}`,
    `normalizationDiffs=${normalizationDifferences.length}`,
    compatible ? "COMPATIBLE" : "DIVERGENT",
  ].join(" | ");

  return {
    compatible,
    coverage,
    matchedMetrics,
    missingMetrics: missing.length,
    extraMetrics: extra.length,
    valueDifferences,
    normalizationDifferences,
    missing,
    extra,
    summary,
    comparedAt: new Date().toISOString(),
  };
}
