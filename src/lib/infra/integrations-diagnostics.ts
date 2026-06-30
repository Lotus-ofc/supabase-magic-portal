/** Diagnóstico de integrações de dados — reutilizável. */

export type IntegrationStatus = "ok" | "warn" | "error" | "unknown";

export interface IntegrationDiagnostic {
  id: string;
  label: string;
  platform_key: string;
  status: IntegrationStatus;
  record_count: number;
  detail: string;
}

const INTEGRATION_DEFS = [
  { id: "google_ads", label: "Google Ads", keys: ["google_ads", "google ads"] },
  { id: "meta_ads", label: "Meta Ads", keys: ["meta_ads", "meta ads"] },
  { id: "instagram", label: "Instagram", keys: ["instagram"] },
  { id: "ga4", label: "GA4", keys: ["ga4", "google analytics 4"] },
  { id: "tiktok", label: "TikTok", keys: ["tiktok"] },
  { id: "google_business", label: "Google Business", keys: ["google_business", "google business"] },
] as const;

export function buildIntegrationDiagnostics(
  platformCounts: { plataforma: string; total: number }[],
): IntegrationDiagnostic[] {
  const normalized = new Map<string, number>();
  for (const row of platformCounts) {
    const key = row.plataforma.toLowerCase().trim();
    normalized.set(key, (normalized.get(key) ?? 0) + row.total);
  }

  return INTEGRATION_DEFS.map((def) => {
    let count = 0;
    for (const k of def.keys) {
      count += normalized.get(k) ?? 0;
    }
    const status: IntegrationStatus =
      count > 0 ? "ok" : normalized.size > 0 ? "warn" : "unknown";
    return {
      id: def.id,
      label: def.label,
      platform_key: def.id,
      status,
      record_count: count,
      detail:
        count > 0
          ? `${count.toLocaleString("pt-BR")} registros em base_metricas`
          : "Sem dados recentes em base_metricas",
    };
  });
}
