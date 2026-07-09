/**
 * @contract ProviderPort v1.0.0
 * @see contracts/provider/contract.meta.json
 */

import type { ConnectionId } from "../connection/connection-id.v1";
import type { PlatformIdentityV1 } from "../identity/platform-identity.v1";
import type { Capability } from "../plugin/capability.v1";
import type { IngestEnvelopeV1, ProviderType } from "../ingest/ingest-envelope.v1";

export const PROVIDER_CONTRACT_VERSION = "1.0.0" as const;

export interface CollectParamsV1 {
  connectionId: ConnectionId;
  capability: Capability;
  identities: readonly PlatformIdentityV1[];
  window?: { from: string; to: string };
}

/** Provider entrega IngestEnvelope — nunca MetricBatch diretamente na API pública. */
export interface ProviderPortV1 {
  readonly providerType: ProviderType;
  collect(params: CollectParamsV1): Promise<IngestEnvelopeV1>;
}

export interface ProviderFactoryV1 {
  create(): ProviderPortV1;
}
