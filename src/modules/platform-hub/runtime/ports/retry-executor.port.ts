import type { RetryPolicyPort } from "./retry-policy.port";

export interface RetryExecutorPort {
  run<T>(operation: () => Promise<T>, policy: RetryPolicyPort): Promise<T>;
}
