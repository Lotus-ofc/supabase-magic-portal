const MICROS_THRESHOLD = 1_000;

/** Converte spend em micros (Google Ads API) para unidade monetária. */
export function normalizeSpendValue(metricKey: string, value: number): number {
  if (metricKey !== "spend") return value;
  if (!Number.isFinite(value)) return value;
  if (Math.abs(value) < MICROS_THRESHOLD) return value;
  if (!Number.isInteger(value)) return value;
  return value / 1_000_000;
}
