import { getSupabaseAdmin } from "@/integrations/supabase/client.server";

export interface PilotClientCandidateV1 {
  cliente: string;
  rowCount: number;
  minData: string;
  maxData: string;
  distinctCampaigns: number;
  coreMetricCoverage: Record<string, number>;
}

export interface DiscoverPilotClientsOptions {
  plataforma?: string;
  minRows?: number;
  limit?: number;
  from?: string;
  to?: string;
}

type BaseMetricasRow = {
  cliente: string;
  data: string;
  campanha: string | null;
  metrica: string;
};

/**
 * Consulta read-only em base_metricas para escolher cliente piloto Meta.
 * Requer OFFICIAL_SUPABASE_URL + OFFICIAL_SERVICE_ROLE_KEY.
 */
export async function discoverPilotClients(
  options: DiscoverPilotClientsOptions = {},
): Promise<PilotClientCandidateV1[]> {
  const plataforma = options.plataforma ?? "Meta Ads";
  const minRows = options.minRows ?? 100;
  const limit = options.limit ?? 20;

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("base_metricas")
    .select("cliente,data,campanha,metrica")
    .eq("plataforma", plataforma);

  if (options.from) query = query.gte("data", options.from);
  if (options.to) query = query.lte("data", options.to);

  const { data, error } = await query;
  if (error) {
    throw new Error(`Pilot discovery failed: ${error.message}`);
  }

  const rows = (data ?? []) as BaseMetricasRow[];
  const byClient = new Map<string, BaseMetricasRow[]>();
  for (const row of rows) {
    const bucket = byClient.get(row.cliente) ?? [];
    bucket.push(row);
    byClient.set(row.cliente, bucket);
  }

  const coreMetrics = ["impressions", "reach", "clicks", "spend"];
  const candidates: PilotClientCandidateV1[] = [];

  for (const [cliente, clientRows] of byClient) {
    if (clientRows.length < minRows) continue;

    const dates = new Set(clientRows.map((r) => r.data));
    const campaigns = new Set(clientRows.map((r) => r.campanha ?? ""));
    const coreMetricCoverage: Record<string, number> = {};
    for (const metric of coreMetrics) {
      coreMetricCoverage[metric] = clientRows.filter(
        (r) => r.metrica.toLowerCase() === metric,
      ).length;
    }

    const sortedDates = [...dates].sort();
    candidates.push({
      cliente,
      rowCount: clientRows.length,
      minData: sortedDates[0] ?? "",
      maxData: sortedDates[sortedDates.length - 1] ?? "",
      distinctCampaigns: campaigns.size,
      coreMetricCoverage,
    });
  }

  return candidates.sort((a, b) => b.rowCount - a.rowCount).slice(0, limit);
}

export function formatPilotDiscoveryTable(candidates: PilotClientCandidateV1[]): string {
  if (candidates.length === 0) {
    return "Nenhum cliente piloto encontrado com os filtros informados.";
  }

  const header = [
    "cliente",
    "rows",
    "min_data",
    "max_data",
    "campaigns",
    "impressions",
    "reach",
    "clicks",
    "spend",
  ].join("\t");

  const lines = candidates.map((c) =>
    [
      c.cliente,
      c.rowCount,
      c.minData,
      c.maxData,
      c.distinctCampaigns,
      c.coreMetricCoverage.impressions ?? 0,
      c.coreMetricCoverage.reach ?? 0,
      c.coreMetricCoverage.clicks ?? 0,
      c.coreMetricCoverage.spend ?? 0,
    ].join("\t"),
  );

  return [header, ...lines].join("\n");
}
