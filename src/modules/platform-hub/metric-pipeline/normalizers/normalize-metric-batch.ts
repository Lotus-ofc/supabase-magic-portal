import type { MetricBatchV1, MetricRowV1, NormalizedMetricBatchV1 } from "../metric-batch.types";
import { normalizePlatformLabel } from "./platform-label.normalizer";
import { normalizeMetricKey } from "./metric-key.normalizer";
import { normalizeSpendValue } from "./spend-micros.normalizer";
import { normalizeCanonicalClientName } from "./alias.normalizer";

function normalizeRow(row: MetricRowV1): MetricRowV1 {
  const metricKey = normalizeMetricKey(row.metricKey);
  return {
    ...row,
    metricKey,
    value: normalizeSpendValue(metricKey, row.value),
    date: row.date.trim(),
    campaign: row.campaign?.trim() || undefined,
  };
}

/** Aplica normalizers do pipeline — pronto para MetricWriterPort. */
export function normalizeMetricBatch(batch: MetricBatchV1): NormalizedMetricBatchV1 {
  return {
    ...batch,
    platformLabel: normalizePlatformLabel(batch.platformLabel),
    canonicalClientName: normalizeCanonicalClientName(batch.canonicalClientName),
    rows: batch.rows.map(normalizeRow),
    normalizedAt: new Date().toISOString(),
  };
}
