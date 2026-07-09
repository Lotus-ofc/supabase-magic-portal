import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { YouTubeAnalyticsRowV1 } from "./youtube-api.types";

const METRIC_MAP = [
  { key: "views", index: 0 },
  { key: "impressions", index: 1 },
] as const;

function parseMetricValue(raw: number | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  return Number.isFinite(raw) ? raw : null;
}

/** Converte linhas YouTube Analytics → long format compatível com Make / base_metricas. */
export function mapYouTubeRowsToMetricRows(rows: readonly YouTubeAnalyticsRowV1[]): MetricRowV1[] {
  const metricRows: MetricRowV1[] = [];

  for (const row of rows) {
    const date = row.dimensions?.[0];
    if (!date) continue;

    for (const field of METRIC_MAP) {
      const value = parseMetricValue(row.metrics?.[field.index]);
      if (value === null) continue;
      metricRows.push({ metricKey: field.key, value, date });
    }
  }

  return metricRows;
}

export function countYouTubeReportDays(rows: readonly YouTubeAnalyticsRowV1[]): number {
  const days = new Set<string>();
  for (const row of rows) {
    const date = row.dimensions?.[0];
    if (date) days.add(date);
  }
  return days.size;
}
