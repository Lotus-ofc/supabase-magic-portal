import type { BaselineMetricasQueryPort, BaselineReaderPort } from "./ports/baseline-reader.port";
import type { BaselineReadFilterV1, BaselineReadResultV1 } from "./types";
import { SupabaseBaselineMetricasQuery } from "./supabase-reader";

export interface BaselineReaderOptions {
  queryPort?: BaselineMetricasQueryPort;
  source?: "supabase" | "memory";
}

/**
 * Baseline Reader — somente leitura de base_metricas.
 * Não escreve, não normaliza métricas, não conhece Provider/Runtime/Pipeline.
 */
export class BaselineReader implements BaselineReaderPort {
  private readonly queryPort: BaselineMetricasQueryPort;
  private readonly source: "supabase" | "memory";

  constructor(options: BaselineReaderOptions = {}) {
    this.queryPort = options.queryPort ?? new SupabaseBaselineMetricasQuery();
    this.source = options.source ?? (options.queryPort ? "memory" : "supabase");
  }

  async read(filter: BaselineReadFilterV1): Promise<BaselineReadResultV1> {
    const rows = await this.queryPort.query(filter);
    return {
      filter,
      rows,
      readAt: new Date().toISOString(),
      source: this.source,
    };
  }
}

export function createBaselineReader(options: BaselineReaderOptions = {}): BaselineReader {
  return new BaselineReader(options);
}
