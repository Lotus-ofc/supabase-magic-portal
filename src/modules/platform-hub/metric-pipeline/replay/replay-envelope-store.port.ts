import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { IngestEnvelopeV1 } from "../ingest-envelope.types";

export interface ReplayEnvelopeStorePort {
  save(envelope: IngestEnvelopeV1): Promise<void>;
  listByConnection(connectionId: ConnectionId): Promise<readonly IngestEnvelopeV1[]>;
}
