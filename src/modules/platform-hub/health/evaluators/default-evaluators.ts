import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { HealthEvaluatorPort } from "../ports/health-evaluator.port";
import type { HealthSignalsV1 } from "../types";

const DAY_MS = 86_400_000;

export const FreshnessEvaluator: HealthEvaluatorPort = {
  key: "freshness",
  maxScore: 25,
  evaluate(_connectionId: ConnectionId, signals: HealthSignalsV1) {
    if (!signals.lastSyncAt) {
      return { evaluatorKey: "freshness", score: 0, maxScore: 25, notes: "no sync recorded" };
    }
    const ageMs = Date.now() - Date.parse(signals.lastSyncAt);
    if (ageMs <= DAY_MS) {
      return { evaluatorKey: "freshness", score: 25, maxScore: 25 };
    }
    if (ageMs <= DAY_MS * 3) {
      return { evaluatorKey: "freshness", score: 15, maxScore: 25, notes: "stale sync" };
    }
    return { evaluatorKey: "freshness", score: 5, maxScore: 25, notes: "very stale sync" };
  },
};

export const CredentialEvaluator: HealthEvaluatorPort = {
  key: "credential",
  maxScore: 25,
  evaluate(_connectionId: ConnectionId, signals: HealthSignalsV1) {
    switch (signals.tokenStatus) {
      case "valid":
        return { evaluatorKey: "credential", score: 25, maxScore: 25 };
      case "expiring":
        return { evaluatorKey: "credential", score: 12, maxScore: 25, notes: "token expiring" };
      case "revoked":
        return { evaluatorKey: "credential", score: 0, maxScore: 25, notes: "token revoked" };
      default:
        return { evaluatorKey: "credential", score: 10, maxScore: 25, notes: "token unknown" };
    }
  },
};

export const QuotaEvaluator: HealthEvaluatorPort = {
  key: "quota",
  maxScore: 20,
  evaluate(_connectionId: ConnectionId, signals: HealthSignalsV1) {
    const penalty = Math.min(signals.rateLimitHits * 5, 20);
    return {
      evaluatorKey: "quota",
      score: 20 - penalty,
      maxScore: 20,
      notes: signals.rateLimitHits > 0 ? `${signals.rateLimitHits} rate limit hits` : undefined,
    };
  },
};

export const FailureEvaluator: HealthEvaluatorPort = {
  key: "failure",
  maxScore: 20,
  evaluate(_connectionId: ConnectionId, signals: HealthSignalsV1) {
    const penalty = Math.min(signals.consecutiveErrors * 7, 20);
    return {
      evaluatorKey: "failure",
      score: 20 - penalty,
      maxScore: 20,
      notes:
        signals.consecutiveErrors > 0
          ? `${signals.consecutiveErrors} consecutive errors`
          : undefined,
    };
  },
};

export const VersionEvaluator: HealthEvaluatorPort = {
  key: "version",
  maxScore: 10,
  evaluate(_connectionId: ConnectionId, signals: HealthSignalsV1) {
    const penalty = Math.min(signals.apiVersionWarnings * 5, 10);
    return {
      evaluatorKey: "version",
      score: 10 - penalty,
      maxScore: 10,
      notes:
        signals.apiVersionWarnings > 0 ? `${signals.apiVersionWarnings} api warnings` : undefined,
    };
  },
};

export const defaultHealthEvaluators: readonly HealthEvaluatorPort[] = [
  FreshnessEvaluator,
  CredentialEvaluator,
  QuotaEvaluator,
  FailureEvaluator,
  VersionEvaluator,
];
