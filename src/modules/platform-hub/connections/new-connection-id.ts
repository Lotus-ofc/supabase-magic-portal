import { randomUUID } from "node:crypto";
import { asConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";

export function newConnectionId(): ConnectionId {
  return asConnectionId(randomUUID());
}
