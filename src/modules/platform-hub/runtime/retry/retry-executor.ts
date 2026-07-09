import type { RetryPolicyPort } from "../ports/retry-policy.port";
import type { RetryExecutorPort } from "../ports/retry-executor.port";

export class SimpleRetryPolicy implements RetryPolicyPort {
  constructor(readonly maxAttempts: number) {}

  shouldRetry(attempt: number, _error: unknown): boolean {
    return attempt < this.maxAttempts;
  }
}

export class RetryExecutor implements RetryExecutorPort {
  async run<T>(operation: () => Promise<T>, policy: RetryPolicyPort): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!policy.shouldRetry(attempt, error)) {
          throw error;
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Retry exhausted");
  }
}
