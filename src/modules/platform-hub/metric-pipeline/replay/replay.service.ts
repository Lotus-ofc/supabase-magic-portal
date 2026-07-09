import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { MetricPipelinePort } from "../ports";
import type { ReplayEnvelopeStorePort } from "./replay-envelope-store.port";

export interface ReplayResultV1 {
  connectionId: ConnectionId;
  replayed: number;
  writerResults: Awaited<ReturnType<MetricPipelinePort["accept"]>>[];
}

/** Re-feed histórico de IngestEnvelope pelo MetricPipeline. */
export class ReplayService {
  constructor(
    private readonly pipeline: MetricPipelinePort,
    private readonly store: ReplayEnvelopeStorePort,
  ) {}

  async replayConnection(connectionId: ConnectionId): Promise<ReplayResultV1> {
    const envelopes = await this.store.listByConnection(connectionId);
    const writerResults = [];

    for (const envelope of envelopes) {
      writerResults.push(await this.pipeline.accept(envelope));
    }

    return { connectionId, replayed: envelopes.length, writerResults };
  }
}
