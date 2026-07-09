/** Linha long-format exatamente como em base_metricas (somente leitura). */
export interface BaselineMetricRowV1 {
  data: string;
  cliente: string;
  plataforma: string;
  metrica: string;
  valor: number;
  campanha?: string | null;
}

export interface BaselineReadFilterV1 {
  cliente: string;
  plataforma: string;
  from: string;
  to: string;
  /** Se omitido, retorna todas as campanhas do filtro. */
  campanha?: string | null;
  /** Se omitido, retorna todas as métricas do filtro. */
  metricas?: readonly string[];
}

export interface BaselineReadResultV1 {
  filter: BaselineReadFilterV1;
  rows: readonly BaselineMetricRowV1[];
  readAt: string;
  source: "supabase" | "memory";
}
