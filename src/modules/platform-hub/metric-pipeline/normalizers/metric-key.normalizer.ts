/** Normaliza metricKey para base_metricas.metrica. */
export function normalizeMetricKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}
