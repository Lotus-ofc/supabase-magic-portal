import type { NormalizedMetricBatchV1, WriteResultV1 } from "../metric-batch.types";
import type { MetricWriterPort } from "./metric-writer.port";
import type { BaseMetricasRowV1 } from "./map-to-base-metricas-rows";
import { toBaseMetricasRows } from "./map-to-base-metricas-rows";

/** MemoryWriter — simula base_metricas sem Supabase (dev/testes). */
export class InMemoryBaseMetricasWriter implements MetricWriterPort {
  readonly writerKey = "base_metricas_memory";

  private readonly rows: BaseMetricasRowV1[] = [];

  async write(batch: NormalizedMetricBatchV1): Promise<WriteResultV1> {
    let rowsWritten = 0;
    let rowsSkipped = 0;

    for (const row of batch.rows) {
      if (!batch.canonicalClientName || !row.metricKey || !row.date) {
        rowsSkipped += 1;
        continue;
      }
    }

    const mapped = toBaseMetricasRows(batch);
    rowsSkipped += batch.rows.length - mapped.length;

    for (const row of mapped) {
      this.rows.push({ ...row });
      rowsWritten += 1;
    }

    return { rowsWritten, rowsSkipped, writerKey: this.writerKey };
  }

  snapshot(): readonly BaseMetricasRowV1[] {
    return this.rows.map((row) => ({ ...row }));
  }

  count(): number {
    return this.rows.length;
  }
}

/** @deprecated Use InMemoryBaseMetricasWriter — alias de compatibilidade. */
export const BaseMetricasWriter = InMemoryBaseMetricasWriter;
