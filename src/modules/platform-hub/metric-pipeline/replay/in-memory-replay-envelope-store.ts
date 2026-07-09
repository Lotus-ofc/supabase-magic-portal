import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { IngestEnvelopeV1 } from "../ingest-envelope.types";
import type { ReplayEnvelopeStorePort } from "./replay-envelope-store.port";

export class InMemoryReplayEnvelopeStore implements ReplayEnvelopeStorePort {
  private readonly envelopes = new Map<ConnectionId, IngestEnvelopeV1[]>();

  async save(envelope: IngestEnvelopeV1): Promise<void> {
    const list = this.envelopes.get(envelope.connectionId) ?? [];
    list.push({ ...envelope });
    this.envelopes.set(envelope.connectionId, list);
  }

  async listByConnection(connectionId: ConnectionId): Promise<readonly IngestEnvelopeV1[]> {
    return (this.envelopes.get(connectionId) ?? []).map((envelope) => ({ ...envelope }));
  }
}
