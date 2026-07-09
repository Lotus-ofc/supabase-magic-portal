import type { SupabaseClient } from "@supabase/supabase-js";
import type { BaselineReadFilterV1, BaselineMetricRowV1 } from "../base-metricas-reader/types";
import { fromBaseMetricasDbRow } from "../base-metricas-reader/mapping";

type MetricasDbRow = {
  data: string;
  cliente: string;
  plataforma: string;
  metrica: string;
  valor: number;
  campanha: string | null;
};

const TABLE_MAKE = "base_metricas_make";
const TABLE_HUB = "base_metricas_hub";

async function queryTable(
  supabase: SupabaseClient,
  table: string,
  filter: BaselineReadFilterV1,
): Promise<readonly BaselineMetricRowV1[]> {
  let query = supabase
    .from(table)
    .select("data,cliente,plataforma,metrica,valor,campanha")
    .eq("cliente", filter.cliente)
    .eq("plataforma", filter.plataforma)
    .gte("data", filter.from)
    .lte("data", filter.to);

  if (filter.campanha !== undefined && filter.campanha !== null) {
    query = query.eq("campanha", filter.campanha);
  }
  if (filter.metricas && filter.metricas.length > 0) {
    query = query.in("metrica", [...filter.metricas]);
  }

  const { data, error } = await query.order("data", { ascending: true });
  if (error) throw new Error(`${table} read failed: ${error.message}`);
  return ((data ?? []) as MetricasDbRow[]).map(fromBaseMetricasDbRow);
}

/** Leitura Make (produção) — baseline para comparação. */
export async function readMakeMetricas(
  supabase: SupabaseClient,
  filter: BaselineReadFilterV1,
): Promise<readonly BaselineMetricRowV1[]> {
  return queryTable(supabase, TABLE_MAKE, filter);
}

/** Leitura Hub (homologação) — candidato para comparação. */
export async function readHubMetricas(
  supabase: SupabaseClient,
  filter: BaselineReadFilterV1,
): Promise<readonly BaselineMetricRowV1[]> {
  return queryTable(supabase, TABLE_HUB, filter);
}
