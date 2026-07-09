import { RateLimitHttpError } from "./fetch-http-client";
import { HttpClientError } from "./http-client.port";

export interface HttpRetryOptions {
  maxAttempts?: number;
  delayMs?: number;
}

function isRetryableHttpError(error: unknown): boolean {
  if (error instanceof RateLimitHttpError) return true;
  if (error instanceof HttpClientError) {
    return error.status === 429 || error.status >= 500;
  }
  return false;
}

export async function withHttpRetry<T>(
  operation: () => Promise<T>,
  options: HttpRetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? 3;
  const delayMs = options.delayMs ?? 0;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !isRetryableHttpError(error)) {
        throw error;
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("HTTP retry exhausted");
}
