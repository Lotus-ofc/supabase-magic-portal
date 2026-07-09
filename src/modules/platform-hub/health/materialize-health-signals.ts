import type { HealthSignalsV1 } from "../types";
import type { StoredHealthSignalV1 } from "../types";

/** Replay determinístico de sinais → HealthSignalsV1. */
export function materializeHealthSignals(
  signals: readonly StoredHealthSignalV1[],
): HealthSignalsV1 {
  let lastSyncAt: string | undefined;
  let consecutiveErrors = 0;
  let tokenStatus: HealthSignalsV1["tokenStatus"] = "unknown";
  let rateLimitHits = 0;
  let apiVersionWarnings = 0;

  for (const stored of signals) {
    const event = stored.signal;
    switch (event.type) {
      case "INTEGRATION_SYNC_FINISHED":
        lastSyncAt = event.occurredAt;
        consecutiveErrors = 0;
        break;
      case "INTEGRATION_SYNC_FAILED":
        consecutiveErrors = event.payload.consecutiveErrors;
        break;
      case "INTEGRATION_CREDENTIAL_EXPIRING":
        tokenStatus = "expiring";
        break;
      case "INTEGRATION_CREDENTIAL_REVOKED":
        tokenStatus = "revoked";
        break;
      case "INTEGRATION_RATE_LIMIT_HIT":
        rateLimitHits += 1;
        break;
      case "INTEGRATION_API_VERSION_DEPRECATING":
        apiVersionWarnings += 1;
        break;
      case "INTEGRATION_CONNECTION_HEALTH_CHANGED":
        break;
      default:
        break;
    }
  }

  return {
    lastSyncAt,
    consecutiveErrors,
    tokenStatus,
    rateLimitHits,
    apiVersionWarnings,
  };
}
