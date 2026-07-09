import type { ConnectionServicePort } from "@/modules/platform-hub/connections/ports/connection-service.port";
import type { IdentityServicePort } from "@/modules/platform-hub/identity/ports/identity-service.port";
import type { ConnectionResolverPort } from "@/modules/platform-hub/connections/ports";
import type { ProviderPortV1 } from "../../../../contracts/provider/provider.v1";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { SyncOrchestratorPort } from "../ports/sync-orchestrator.port";
import type { ExecutionContextV1 } from "../types";
import type { IngestEnvelopeV1 } from "../../../../contracts/ingest/ingest-envelope.v1";
import { collectIngestEnvelope } from "@/modules/platform-hub/plugins/_internal/provider-framework";

export type ProviderResolverPort = (connectionId: ConnectionId) => Promise<ProviderPortV1>;

/** Orquestra collect — genérico, sem conhecer plataforma. */
export class SyncOrchestrator implements SyncOrchestratorPort {
  constructor(
    private readonly connectionService: ConnectionServicePort,
    private readonly identityService: IdentityServicePort,
    private readonly resolver: ConnectionResolverPort,
    private readonly resolveProvider?: ProviderResolverPort,
  ) {}

  async collect(context: ExecutionContextV1): Promise<IngestEnvelopeV1> {
    const provider = this.resolveProvider
      ? await this.resolveProvider(context.connectionId)
      : await this.connectionService.getActiveProvider(context.connectionId);

    const identities = await this.identityService.list(context.connectionId);

    return collectIngestEnvelope({
      resolver: this.resolver,
      provider,
      connectionId: context.connectionId,
      capability: context.capability,
      identities,
    });
  }
}
