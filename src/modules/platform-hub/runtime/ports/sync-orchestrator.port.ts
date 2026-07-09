import type { ExecutionContextV1 } from "../types";
import type { IngestEnvelopeV1 } from "../../../../contracts/ingest/ingest-envelope.v1";

export interface SyncOrchestratorPort {
  collect(context: ExecutionContextV1): Promise<IngestEnvelopeV1>;
}
