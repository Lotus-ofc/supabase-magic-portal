import type { ConnectionId } from "../connection/connection-id.v1";
import type { PluginKey } from "../plugin/capability.v1";
import type { IntegrationEventV1 } from "../events/integration-events.v1";

export const HEALTH_SIGNAL_CONTRACT_VERSION = "1.0.0" as const;

/** Sinal inbound — fatos emitidos por Runtime (F6+) ou testes (F5). Health não conhece origem. */
export type HealthInboundSignalV1 = IntegrationEventV1;

export interface StoredHealthSignalV1 {
  readonly version: typeof HEALTH_SIGNAL_CONTRACT_VERSION;
  readonly sequence: number;
  connectionId: ConnectionId;
  pluginKey: PluginKey;
  signal: HealthInboundSignalV1;
  receivedAt: string;
}
