import type { HubRegistryPort } from "@/modules/platform-hub/ports";
import type { LegacyCadastroBridgePort } from "@/modules/platform-hub/bridges/ports";
import type { ProviderPortV1 } from "../../../../contracts/provider/provider.v1";
import type { ProviderType } from "../../../../contracts/ingest/ingest-envelope.v1";
import type { Capability } from "../../../../contracts/plugin/capability.v1";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ConnectionRepositoryPort } from "./ports/connection-repository.port";
import type { ConnectionServicePort } from "./ports/connection-service.port";
import type {
  ConnectionRecordV1,
  CreateConnectionInputV1,
  UpdateConnectionInputV1,
} from "./types/connection-record.v1";
import { newConnectionId } from "./new-connection-id";

function defaultCapability(
  capabilities: readonly Capability[],
  requested?: Capability,
): Capability {
  const metricsCap = capabilities.find((cap) => cap.endsWith(":metrics:collect"));
  const capability = requested ?? metricsCap ?? capabilities[0];
  if (!capability) {
    throw new Error("Plugin manifest has no capabilities");
  }
  if (requested && !capabilities.includes(requested)) {
    throw new Error(`Capability not supported: ${requested}`);
  }
  return capability;
}

/** Coordenador — administra Connection; resolve Provider via Registry (nunca chama collect). */
export class ConnectionService implements ConnectionServicePort {
  constructor(
    private readonly repository: ConnectionRepositoryPort,
    private readonly registry: HubRegistryPort,
    private readonly bridge: LegacyCadastroBridgePort,
  ) {}

  async create(input: CreateConnectionInputV1): Promise<ConnectionRecordV1> {
    const manifest = this.registry.getPlugin(input.pluginKey).manifest;
    const supported = manifest.providers.supported as readonly ProviderType[];
    const activeProviderType = input.activeProviderType ?? manifest.providers.default;

    if (!supported.includes(activeProviderType)) {
      throw new Error(`Provider not supported for ${input.pluginKey}: ${activeProviderType}`);
    }

    const capability = defaultCapability(
      manifest.capabilities as readonly Capability[],
      input.capability,
    );

    const connectionId = newConnectionId();
    this.bridge.registerConnection(connectionId, input.scopeRef);

    const now = new Date().toISOString();
    return this.repository.create({
      connectionId,
      pluginKey: input.pluginKey,
      label: input.label,
      scopeRef: input.scopeRef,
      capability,
      activeProviderType,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  async get(connectionId: ConnectionId): Promise<ConnectionRecordV1> {
    const record = await this.repository.get(connectionId);
    if (!record) {
      throw new Error(`Connection not found: ${connectionId}`);
    }
    return record;
  }

  async update(
    connectionId: ConnectionId,
    patch: UpdateConnectionInputV1,
  ): Promise<ConnectionRecordV1> {
    return this.repository.update(connectionId, patch);
  }

  async list(): Promise<readonly ConnectionRecordV1[]> {
    return this.repository.list();
  }

  async delete(connectionId: ConnectionId): Promise<void> {
    await this.repository.delete(connectionId);
  }

  async setActiveProvider(
    connectionId: ConnectionId,
    providerType: ProviderType,
  ): Promise<ConnectionRecordV1> {
    const record = await this.get(connectionId);
    const supported = this.registry.getPlugin(record.pluginKey).manifest.providers
      .supported as readonly ProviderType[];

    if (!supported.includes(providerType)) {
      throw new Error(`Provider not supported: ${providerType}`);
    }

    return this.repository.update(connectionId, { activeProviderType: providerType });
  }

  async getActiveProvider(connectionId: ConnectionId): Promise<ProviderPortV1> {
    const record = await this.get(connectionId);
    return this.registry.getPlugin(record.pluginKey).adapter.getProvider(record.activeProviderType);
  }
}
