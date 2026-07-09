import type { BaselineMetricasQueryPort } from "./ports/baseline-reader.port";
import type { BaselineMetricRowV1, BaselineReadFilterV1 } from "./types";
import { normalizeCampaign } from "./mapping";

function matchesFilter(row: BaselineMetricRowV1, filter: BaselineReadFilterV1): boolean {
  if (row.cliente !== filter.cliente) return false;
  if (row.plataforma !== filter.plataforma) return false;
  if (row.data < filter.from || row.data > filter.to) return false;

  if (filter.campanha !== undefined && filter.campanha !== null) {
    if (normalizeCampaign(row.campanha) !== normalizeCampaign(filter.campanha)) return false;
  }

  if (filter.metricas && filter.metricas.length > 0) {
    if (!filter.metricas.includes(row.metrica)) return false;
  }

  return true;
}

/** Fixture in-memory — testes e demos sem Supabase. */
export class InMemoryBaselineMetricasQuery implements BaselineMetricasQueryPort {
  constructor(private readonly rows: readonly BaselineMetricRowV1[]) {}

  async query(filter: BaselineReadFilterV1): Promise<readonly BaselineMetricRowV1[]> {
    return this.rows.filter((row) => matchesFilter(row, filter)).map((row) => ({ ...row }));
  }
}
