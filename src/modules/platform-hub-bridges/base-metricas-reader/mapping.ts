import type { BaseMetricasRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";
import type { BaselineMetricRowV1 } from "./types";

/** Normaliza campanha vazia para comparação estável. */
export function normalizeCampaign(value?: string | null): string {
  if (value === undefined || value === null) return "";
  return value.trim();
}

/** Chave canônica: cliente + plataforma + data + metrica + campanha. */
export function baselineRowKey(row: {
  cliente: string;
  plataforma: string;
  data: string;
  metrica: string;
  campanha?: string | null;
}): string {
  return [
    row.cliente.trim(),
    row.plataforma.trim(),
    row.data.trim(),
    row.metrica.trim().toLowerCase(),
    normalizeCampaign(row.campanha),
  ].join("::");
}

/** Converte snapshot do MemoryWriter → baseline row (sem transformação de valor). */
export function fromWriterSnapshot(rows: readonly BaseMetricasRowV1[]): BaselineMetricRowV1[] {
  return rows.map((row) => ({
    data: row.data,
    cliente: row.cliente,
    plataforma: row.plataforma,
    metrica: row.metrica,
    valor: row.valor,
    campanha: row.campanha ?? null,
  }));
}

/** Identidade: baseline DB → BaselineMetricRowV1 (sem transformar). */
export function fromBaseMetricasDbRow(row: {
  data: string;
  cliente: string;
  plataforma: string;
  metrica: string;
  valor: number;
  campanha?: string | null;
}): BaselineMetricRowV1 {
  return {
    data: row.data,
    cliente: row.cliente,
    plataforma: row.plataforma,
    metrica: row.metrica,
    valor: Number(row.valor),
    campanha: row.campanha ?? null,
  };
}

/**
 * Aliases conhecidos de métricas (legado Make ↔ Hub).
 * Usados apenas para classificar diferenças de normalização — não alteram a comparação principal.
 */
export const METRIC_ALIAS_GROUPS: ReadonlyArray<readonly string[]> = [
  ["impressions", "impressoes", "impressões"],
  ["clicks", "cliques"],
  ["reach", "alcance"],
  ["spend", "gasto", "investimento", "cost"],
];

export function metricAliasCanonical(metricKey: string): string {
  const lower = metricKey.trim().toLowerCase();
  for (const group of METRIC_ALIAS_GROUPS) {
    if (group.includes(lower)) return group[0]!;
  }
  return lower;
}

export const PLATFORM_ALIAS_GROUPS: ReadonlyArray<readonly string[]> = [
  ["Meta Ads", "meta", "meta_ads", "Meta"],
  ["Google Ads", "google_ads", "google ads"],
  ["GA4", "ga4", "Google Analytics 4"],
  ["TikTok", "tiktok"],
  ["YouTube", "youtube"],
  ["Google Business", "google_business", "google business"],
];

export function platformAliasCanonical(platform: string): string {
  const lower = platform.trim().toLowerCase();
  for (const group of PLATFORM_ALIAS_GROUPS) {
    if (group.some((alias) => alias.toLowerCase() === lower)) return group[0]!;
  }
  return platform.trim();
}
