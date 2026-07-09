export interface HttpRequestInitV1 {
  method?: "GET" | "POST" | "DELETE";
  headers?: Record<string, string>;
  body?: string;
  searchParams?: Record<string, string | undefined>;
}

export interface HttpResponseV1 {
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  json<T>(): Promise<T>;
  text(): Promise<string>;
}

/** Port HTTP genérico — reutilizável por Meta, TikTok, Google, etc. */
export interface HttpClientPort {
  request(url: string, init?: HttpRequestInitV1): Promise<HttpResponseV1>;
}

export class HttpClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

export function isHttpClientError(error: unknown): error is HttpClientError {
  return error instanceof HttpClientError;
}
