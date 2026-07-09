import type { Capability } from "../../../../../../contracts/plugin/capability.v1";
import type { PlatformIdentityV1 } from "../../../../../../contracts/identity/platform-identity.v1";
import type { ProviderPortV1 } from "../../../../../../contracts/provider/provider.v1";
import type { IngestEnvelopeV1 } from "../../../../../../contracts/ingest/ingest-envelope.v1";
import { isMetricsTimeseriesEnvelope } from "../../../../../../contracts/ingest/ingest-envelope.v1";
import type { ConnectionResolverPort } from "@/modules/platform-hub/connections/ports";
import type { ConnectionId } from "@/modules/platform-hub/connections/types";

export interface CollectIngestEnvelopeInput {
  resolver: ConnectionResolverPort;
  provider: ProviderPortV1;
  connectionId: ConnectionId;
  capability: Capability;
  identities?: readonly PlatformIdentityV1[];
  window?: { from: string; to: string };
}

/**
 * Orquestra Provider → IngestEnvelope com resolução de nome canônico.
 * Sem pipeline, banco, runtime ou eventos.
 */
export async function collectIngestEnvelope(
  input: CollectIngestEnvelopeInput,
): Promise<IngestEnvelopeV1> {
  const envelope = await input.provider.collect({
    connectionId: input.connectionId,
    capability: input.capability,
    identities: input.identities ?? [],
    window: input.window,
  });

  if (isMetricsTimeseriesEnvelope(envelope) && envelope.payload.canonicalClientName === "") {
    envelope.payload.canonicalClientName = await input.resolver.resolveCanonicalClientName(
      input.connectionId,
    );
  }

  return envelope;
}
