import { getSupabaseAdmin } from "@/integrations/supabase/client.server";
import type { BaseMetricasInsertRowV1 } from "@/modules/platform-hub/metric-pipeline/writers/map-to-base-metricas-rows";
import type { BaseMetricasInsertPort } from "./ports/base-metricas-insert.port";
import {
  assertHubWriterTable,
  METRICAS_TABLE_HUB,
  resolveWriterTables,
  type WriterTarget,
} from "./writer-target.config";

const INSERT_CHUNK_SIZE = 500;

export interface SupabaseBaseMetricasInsertAdapterOptions {
  writerTarget?: WriterTarget;
  /** Override explícito de tabelas (testes). */
  tables?: readonly string[];
}

/** Adapter Supabase — grava em base_metricas_hub (homologação). Nunca em make. */
export class SupabaseBaseMetricasInsertAdapter implements BaseMetricasInsertPort {
  private readonly tables: readonly string[];

  constructor(private readonly options: SupabaseBaseMetricasInsertAdapterOptions = {}) {
    this.tables = options.tables ?? resolveWriterTables(options.writerTarget ?? "HUB");
  }

  async insertRows(rows: readonly BaseMetricasInsertRowV1[]): Promise<{ inserted: number }> {
    if (rows.length === 0) return { inserted: 0 };

    const supabase = getSupabaseAdmin();
    let inserted = 0;

    for (const table of this.tables) {
      assertHubWriterTable(table);
      for (let i = 0; i < rows.length; i += INSERT_CHUNK_SIZE) {
        const chunk = rows.slice(i, i + INSERT_CHUNK_SIZE);
        const { error } = await supabase.from(table).insert(chunk);
        if (error) {
          throw new Error(`${table} insert failed: ${error.message}`);
        }
        inserted += chunk.length;
      }
    }

    return { inserted };
  }
}

export function createHubMetricasInsertAdapter(
  options?: SupabaseBaseMetricasInsertAdapterOptions,
): SupabaseBaseMetricasInsertAdapter {
  return new SupabaseBaseMetricasInsertAdapter({
    writerTarget: "HUB",
    tables: [METRICAS_TABLE_HUB],
    ...options,
  });
}
