/**
 * @contract HealthReconciliation v1.0.0
 * @see contracts/health/contract.meta.json
 *
 * Backstop periódico quando eventos são perdidos. Spec Fase -2; impl Fase 5.
 */

import type { ConnectionId } from "../connection/connection-id.v1";

export const HEALTH_RECONCILIATION_CONTRACT_VERSION = "1.0.0" as const;

export interface HealthSignalsV1 {
  lastSyncAt?: string;
  consecutiveErrors: number;
  tokenStatus: "valid" | "expiring" | "revoked" | "unknown";
  rateLimitHits: number;
  apiVersionWarnings: number;
}

export interface ReconciliationResultV1 {
  connectionId: ConnectionId;
  reconciledAt: string;
  signals: HealthSignalsV1;
  source: "events" | "reconciliation";
}

export interface HealthReconciliationPortV1 {
  reconcile(connectionId: ConnectionId): Promise<ReconciliationResultV1>;
}

export interface HealthEvaluatorV1 {
  pluginKey: string;
  evaluate(
    connectionId: ConnectionId,
    signals: HealthSignalsV1,
  ): { scoreDelta: number; notes?: string };
}
