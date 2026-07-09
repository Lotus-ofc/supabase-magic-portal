export type { ConnectionId, ScopeRef } from "./types";
export type {
  ConnectionResolverPort,
  ConnectionRepositoryPort,
  ConnectionServicePort,
  CredentialVaultPort,
  CredentialKey,
  CredentialPayloadV1,
} from "./ports";
export type {
  ConnectionRecordV1,
  CreateConnectionInputV1,
  UpdateConnectionInputV1,
} from "./types/connection-record.v1";

export { ConnectionResolver } from "./connection-resolver";
export { createConnectionResolver } from "./create-connection-resolver";
export { ConnectionService } from "./connection-service";
export { createConnectionStack } from "./create-connection-stack";
export { InMemoryConnectionRepository } from "./repositories/in-memory-connection.repository";
export { InMemoryCredentialVault } from "./credential-vault/in-memory-credential-vault";
export { newConnectionId } from "./new-connection-id";
export { connectionResolverStub } from "./stubs/connection-resolver.stub";
