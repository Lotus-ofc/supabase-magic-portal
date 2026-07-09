import type { MetricRowV1 } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import type { TikTokReportRowV1 } from "./tiktok-api.types";

const METRIC_FIELDS = ["impressions", "spend"] as const;

function parseMetricValue(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

/** Converte linhas TikTok → long format compatível com Make / base_metricas. */
export function mapTikTokRowsToMetricRows(rows: readonly TikTokReportRowV1[]): MetricRowV1[] {
  const metricRows: MetricRowV1[] = [];

  for (const row of rows) {
    const date = row.dimensions?.stat_time_day?.slice(0, 10);
    const campaign = row.dimensions?.campaign_name;
    if (!date) continue;

    for (const metricKey of METRIC_FIELDS) {
      const value = parseMetricValue(row.metrics?.[metricKey]);
      if (value === null) continue;
      metricRows.push({ metricKey, value, date, campaign });
    }
  }

  return metricRows;
}

export function countDistinctTikTokCampaigns(rows: readonly TikTokReportRowV1[]): number {
  const campaigns = new Set<string>();
  for (const row of rows) {
    const key = row.dimensions?.campaign_name;
    if (key) campaigns.add(key);
  }
  return campaigns.size;
}
