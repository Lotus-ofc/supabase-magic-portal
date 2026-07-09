/**
 * @contract IntegrationEvents v1.0.0
 * @see contracts/events/contract.meta.json
 *
 * Namespace integration.* — schemas separados do catálogo CRM do Core EventBus.
 * Handlers registram no EventBus em runtime (Fase 6+).
 */

import type { ConnectionId } from "../connection/connection-id.v1";
import type { PluginKey } from "../plugin/capability.v1";

export const INTEGRATION_EVENTS_CONTRACT_VERSION = "1.0.0" as const;

export const INTEGRATION_EVENT_TYPES = [
  "INTEGRATION_SYNC_FINISHED",
  "INTEGRATION_SYNC_FAILED",
  "INTEGRATION_CONNECTION_HEALTH_CHANGED",
  "INTEGRATION_CREDENTIAL_EXPIRING",
  "INTEGRATION_CREDENTIAL_REVOKED",
  "INTEGRATION_RATE_LIMIT_HIT",
  "INTEGRATION_API_VERSION_DEPRECATING",
] as const;

export type IntegrationEventType = (typeof INTEGRATION_EVENT_TYPES)[number];

export interface IntegrationEventBaseV1 {
  readonly version: typeof INTEGRATION_EVENTS_CONTRACT_VERSION;
  type: IntegrationEventType;
  connectionId: ConnectionId;
  pluginKey: PluginKey;
  occurredAt: string;
  correlationId?: string;
}

export interface IntegrationSyncFinishedV1 extends IntegrationEventBaseV1 {
  type: "INTEGRATION_SYNC_FINISHED";
  payload: {
    latencyMs: number;
    rowsCount: number;
    providerType: string;
  };
}

export interface IntegrationSyncFailedV1 extends IntegrationEventBaseV1 {
  type: "INTEGRATION_SYNC_FAILED";
  payload: {
    errorCode: string;
    consecutiveErrors: number;
    message?: string;
  };
}

export interface IntegrationConnectionHealthChangedV1 extends IntegrationEventBaseV1 {
  type: "INTEGRATION_CONNECTION_HEALTH_CHANGED";
  payload: {
    score: number;
    status: "healthy" | "degraded" | "unhealthy" | "unknown";
  };
}

export interface IntegrationCredentialExpiringV1 extends IntegrationEventBaseV1 {
  type: "INTEGRATION_CREDENTIAL_EXPIRING";
  payload: { expiresAt: string };
}

export interface IntegrationCredentialRevokedV1 extends IntegrationEventBaseV1 {
  type: "INTEGRATION_CREDENTIAL_REVOKED";
  payload: { reason?: string };
}

export interface IntegrationRateLimitHitV1 extends IntegrationEventBaseV1 {
  type: "INTEGRATION_RATE_LIMIT_HIT";
  payload: { retryAfterMs?: number };
}

export interface IntegrationApiVersionDeprecatingV1 extends IntegrationEventBaseV1 {
  type: "INTEGRATION_API_VERSION_DEPRECATING";
  payload: {
    apiVersion: string;
    deprecationDate?: string;
    supportedUntil?: string;
  };
}

export type IntegrationEventV1 =
  | IntegrationSyncFinishedV1
  | IntegrationSyncFailedV1
  | IntegrationConnectionHealthChangedV1
  | IntegrationCredentialExpiringV1
  | IntegrationCredentialRevokedV1
  | IntegrationRateLimitHitV1
  | IntegrationApiVersionDeprecatingV1;
