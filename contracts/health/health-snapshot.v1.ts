/**
 * @contract HealthSnapshot v1.0.0
 * @see contracts/health/contract.meta.json
 */

import type { ConnectionId } from "../connection/connection-id.v1";
import type { PluginKey } from "../plugin/capability.v1";

export const HEALTH_SNAPSHOT_CONTRACT_VERSION = "1.0.0" as const;

export type HealthStatusV1 = "healthy" | "degraded" | "unhealthy" | "unknown";

export interface HealthEvaluatorContributionV1 {
  evaluatorKey: string;
  score: number;
  maxScore: number;
  notes?: string;
}

export interface HealthSnapshotV1 {
  readonly version: typeof HEALTH_SNAPSHOT_CONTRACT_VERSION;
  connectionId: ConnectionId;
  pluginKey: PluginKey;
  status: HealthStatusV1;
  score: number;
  breakdown: readonly HealthEvaluatorContributionV1[];
  lastUpdated: string;
}
