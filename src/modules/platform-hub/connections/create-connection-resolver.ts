import type { LegacyCadastroBridgePort } from "../bridges/ports";
import { ConnectionResolver } from "./connection-resolver";

export function createConnectionResolver(bridge: LegacyCadastroBridgePort): ConnectionResolver {
  return new ConnectionResolver(bridge);
}
