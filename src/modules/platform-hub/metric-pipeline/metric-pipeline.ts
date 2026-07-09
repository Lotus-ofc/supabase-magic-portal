import { isMetricsTimeseriesEnvelope } from "../../../../contracts/ingest/ingest-envelope.v1";
import type { IngestEnvelopeV1 } from "../ingest-envelope.types";
import type { MetricPipelinePort } from "../ports";
import type { MetricWriterPort } from "../writers/metric-writer.port";
import type { WriteAuditRepositoryPort } from "../audit/write-audit.repository";
import type { ReplayEnvelopeStorePort } from "../replay/replay-envelope-store.port";
import { normalizeMetricBatch } from "./normalizers";

/** Handler do perfil metrics-timeseries — módulo top-level v3.3. */
export class MetricPipeline implements MetricPipelinePort {
  constructor(
    private readonly writers: readonly MetricWriterPort[],
    private readonly auditRepository: WriteAuditRepositoryPort,
    private readonly replayStore?: ReplayEnvelopeStorePort,
  ) {}

  async accept(envelope: IngestEnvelopeV1): Promise<{
    accepted: boolean;
    writerResults: Awaited<ReturnType<MetricWriterPort["write"]>>[];
  }> {
    if (!isMetricsTimeseriesEnvelope(envelope)) {
      return { accepted: false, writerResults: [] };
    }

    const normalized = normalizeMetricBatch(envelope.payload);
    const writerResults = [];

    for (const writer of this.writers) {
      try {
        const result = await writer.write(normalized);
        writerResults.push(result);
        await this.auditRepository.record({ batch: normalized, result });
      } catch {
        const failed = {
          rowsWritten: 0,
          rowsSkipped: normalized.rows.length,
          writerKey: writer.writerKey,
        };
        writerResults.push(failed);
        await this.auditRepository.record({ batch: normalized, result: failed });
      }
    }

    if (this.replayStore) {
      await this.replayStore.save(envelope);
    }

    return { accepted: true, writerResults };
  }
}
