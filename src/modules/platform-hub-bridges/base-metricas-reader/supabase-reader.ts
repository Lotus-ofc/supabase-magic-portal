import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import { fromBaseMetricasDbRow } from "./mapping";
import type { BaselineMetricasQueryPort } from "./ports/baseline-reader.port";
import type { BaselineMetricRowV1, BaselineReadFilterV1 } from "./types";

type BaseMetricasDbRow = {
  data: string;
  cliente: string;
  plataforma: string;
  metrica: string;
  valor: number;
  campanha: string | null;
};

/**
 * Query Supabase — somente SELECT em base_metricas_make (produção Make).
 * Sem transformação: retorna exatamente o que está no banco.
 */
export class SupabaseBaselineMetricasQuery implements BaselineMetricasQueryPort {
  async query(filter: BaselineReadFilterV1): Promise<readonly BaselineMetricRowV1[]> {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("base_metricas_make")
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

    if (error) {
      throw new Error(`base_metricas_make baseline read failed: ${error.message}`);
    }

    const rows = (data ?? []) as BaseMetricasDbRow[];
    return rows.map(fromBaseMetricasDbRow);
  }
}
