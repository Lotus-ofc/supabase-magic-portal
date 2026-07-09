import { PLATFORM_IDENTITY_CONTRACT_VERSION } from "../../../../contracts/identity/platform-identity.v1";
import type { HubRegistryPort } from "@/modules/platform-hub/ports";
import type { ConnectionRepositoryPort } from "@/modules/platform-hub/connections/ports/connection-repository.port";
import type { IdentityType } from "../../../../contracts/identity/platform-identity.v1";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { IdentityRepositoryPort } from "../ports/identity-repository.port";
import type { IdentityServicePort } from "../ports/identity-service.port";
import type {
  AttachIdentityInputV1,
  StoredPlatformIdentityV1,
  UpdateIdentityInputV1,
} from "./types/stored-identity.v1";
import type { IdentityId } from "./types/identity-id.v1";
import { newIdentityId } from "./types/identity-id.v1";

export class IdentityService implements IdentityServicePort {
  constructor(
    private readonly repository: IdentityRepositoryPort,
    private readonly connections: ConnectionRepositoryPort,
    private readonly registry: HubRegistryPort,
  ) {}

  async attach(input: AttachIdentityInputV1): Promise<StoredPlatformIdentityV1> {
    const connection = await this.connections.get(input.connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${input.connectionId}`);
    }

    const manifest = this.registry.getPlugin(connection.pluginKey).manifest;
    const allowedTypes = manifest.identity?.types as readonly IdentityType[] | undefined;
    if (allowedTypes && !allowedTypes.includes(input.identityType)) {
      throw new Error(`Identity type not supported: ${input.identityType}`);
    }

    if (input.isPrimary) {
      await this.repository.clearPrimary(input.connectionId);
    }

    const identity: StoredPlatformIdentityV1 = {
      version: PLATFORM_IDENTITY_CONTRACT_VERSION,
      identityId: newIdentityId(),
      connectionId: input.connectionId,
      identityType: input.identityType,
      externalId: input.externalId,
      label: input.label,
      isPrimary: input.isPrimary ?? false,
      metadata: input.metadata,
    };

    return this.repository.create(identity);
  }

  async get(identityId: IdentityId): Promise<StoredPlatformIdentityV1> {
    const identity = await this.repository.get(identityId);
    if (!identity) {
      throw new Error(`Identity not found: ${identityId}`);
    }
    return identity;
  }

  async list(connectionId: ConnectionId): Promise<readonly StoredPlatformIdentityV1[]> {
    return this.repository.listByConnection(connectionId);
  }

  async update(
    identityId: IdentityId,
    patch: UpdateIdentityInputV1,
  ): Promise<StoredPlatformIdentityV1> {
    return this.repository.update(identityId, patch);
  }

  async detach(identityId: IdentityId): Promise<void> {
    await this.repository.delete(identityId);
  }

  async setPrimary(
    connectionId: ConnectionId,
    identityId: IdentityId,
  ): Promise<StoredPlatformIdentityV1> {
    const identity = await this.get(identityId);
    if (identity.connectionId !== connectionId) {
      throw new Error(`Identity ${identityId} does not belong to connection ${connectionId}`);
    }
    await this.repository.clearPrimary(connectionId);
    return this.repository.update(identityId, { isPrimary: true });
  }
}
