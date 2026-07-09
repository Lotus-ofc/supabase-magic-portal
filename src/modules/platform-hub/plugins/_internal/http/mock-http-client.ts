import type { HttpClientPort, HttpRequestInitV1, HttpResponseV1 } from "./http-client.port";
import { HttpClientError } from "./http-client.port";

export interface MockHttpRoute {
  match: (url: string, init?: HttpRequestInitV1) => boolean;
  respond: (
    url: string,
    init?: HttpRequestInitV1,
  ) => {
    status?: number;
    headers?: Record<string, string>;
    body: unknown;
  };
}

function createJsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): HttpResponseV1 {
  const textBody = typeof body === "string" ? body : JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    headers,
    async json<T>() {
      return JSON.parse(textBody) as T;
    },
    async text() {
      return textBody;
    },
  };
}

function buildUrl(base: string, searchParams?: HttpRequestInitV1["searchParams"]): string {
  if (!searchParams) return base;
  const url = new URL(base);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.toString();
}

export class MockHttpClient implements HttpClientPort {
  constructor(private readonly routes: MockHttpRoute[]) {}

  async request(url: string, init?: HttpRequestInitV1): Promise<HttpResponseV1> {
    const fullUrl = buildUrl(url, init?.searchParams);
    const route = this.routes.find((candidate) => candidate.match(fullUrl, init));
    if (!route) {
      throw new HttpClientError(`No mock route for ${url}`, 404);
    }

    const result = route.respond(fullUrl, init);
    const status = result.status ?? 200;
    const response = createJsonResponse(status, result.body, result.headers ?? {});

    if (!response.ok) {
      throw new HttpClientError(`HTTP ${status}`, status, await response.text());
    }

    return response;
  }
}
