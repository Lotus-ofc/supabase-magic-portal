import { createHubRegistryWithCredentials } from "@/modules/platform-hub/registry/create-hub-registry-with-credentials";
import { createLegacyCadastroBridge } from "@/modules/platform-hub-bridges/legacy-cadastro";
import { ConnectionService } from "./connection-service";
import { InMemoryConnectionRepository } from "./repositories/in-memory-connection.repository";
import { InMemoryCredentialVault } from "./credential-vault/in-memory-credential-vault";
import { IdentityService } from "../identity/identity-service";
import { InMemoryIdentityRepository } from "../identity/repositories/in-memory-identity.repository";

/** Factory Fase 4 — stack in-memory para testes e demos. */
export function createConnectionStack() {
  const credentialVault = new InMemoryCredentialVault();
  const registry = createHubRegistryWithCredentials(credentialVault);
  const bridge = createLegacyCadastroBridge();
  const connectionRepository = new InMemoryConnectionRepository();
  const identityRepository = new InMemoryIdentityRepository();

  const connectionService = new ConnectionService(connectionRepository, registry, bridge);
  const identityService = new IdentityService(identityRepository, connectionRepository, registry);

  return {
    registry,
    bridge,
    connectionRepository,
    identityRepository,
    credentialVault,
    connectionService,
    identityService,
  };
}
