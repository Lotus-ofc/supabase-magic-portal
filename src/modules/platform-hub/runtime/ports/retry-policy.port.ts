export interface RetryPolicyPort {
  readonly maxAttempts: number;
  shouldRetry(attempt: number, error: unknown): boolean;
}
