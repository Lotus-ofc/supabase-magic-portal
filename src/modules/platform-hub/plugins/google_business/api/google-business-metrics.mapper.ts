import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { GoogleBusinessMetricSeriesV1 } from "./google-business-api.types";

const IMPRESSION_METRICS = new Set([
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
]);

const CLICK_METRICS = new Set(["WEBSITE_CLICKS", "CALL_CLICKS"]);

function formatDate(
  date: { year?: number; month?: number; day?: number } | undefined,
): string | null {
  if (!date?.year || !date.month || !date.day) return null;
  const month = String(date.month).padStart(2, "0");
  const day = String(date.day).padStart(2, "0");
  return `${date.year}-${month}-${day}`;
}

function parseMetricValue(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function resolveMetricKey(dailyMetric: string | undefined): "impressions" | "clicks" | null {
  if (!dailyMetric) return null;
  if (IMPRESSION_METRICS.has(dailyMetric)) return "impressions";
  if (CLICK_METRICS.has(dailyMetric)) return "clicks";
  return null;
}

/** Converte séries GBP → long format compatível com Make / base_metricas. */
export function mapGoogleBusinessSeriesToMetricRows(
  series: readonly GoogleBusinessMetricSeriesV1[],
): MetricRowV1[] {
  const aggregated = new Map<string, { impressions: number; clicks: number }>();

  for (const metricSeries of series) {
    const metricKey = resolveMetricKey(metricSeries.dailyMetric);
    if (!metricKey) continue;

    for (const daily of metricSeries.dailyValues ?? []) {
      const date = formatDate(daily.date);
      const value = parseMetricValue(daily.value);
      if (!date || value === null) continue;

      const bucket = aggregated.get(date) ?? { impressions: 0, clicks: 0 };
      bucket[metricKey] += value;
      aggregated.set(date, bucket);
    }
  }

  const rows: MetricRowV1[] = [];
  for (const [date, values] of aggregated) {
    if (values.impressions > 0) {
      rows.push({ metricKey: "impressions", value: values.impressions, date });
    }
    if (values.clicks > 0) {
      rows.push({ metricKey: "clicks", value: values.clicks, date });
    }
  }

  return rows;
}

export function countGoogleBusinessDays(series: readonly GoogleBusinessMetricSeriesV1[]): number {
  const days = new Set<string>();
  for (const metricSeries of series) {
    for (const daily of metricSeries.dailyValues ?? []) {
      const date = formatDate(daily.date);
      if (date) days.add(date);
    }
  }
  return days.size;
}
