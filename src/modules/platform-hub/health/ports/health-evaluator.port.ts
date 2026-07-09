import type { ConnectionId } from "../../../../contracts/connection/connection-id.v1";
import type { HealthSignalsV1 } from "../types";
import type { HealthEvaluatorContributionV1 } from "../types";

export interface HealthEvaluatorPort {
  readonly key: string;
  readonly maxScore: number;
  evaluate(connectionId: ConnectionId, signals: HealthSignalsV1): HealthEvaluatorContributionV1;
}
