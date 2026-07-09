import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { HttpClientError } from "../../_internal/http/http-client.port";
import { parseRetryAfterMs, RateLimitHttpError } from "../../_internal/http/fetch-http-client";
import type {
  GoogleBusinessMetricsResponseV1,
  GoogleBusinessMetricSeriesV1,
} from "./google-business-api.types";

export interface GoogleBusinessClientConfig {
  httpClient: HttpClientPort;
  apiVersion?: string;
}

export interface FetchGoogleBusinessMetricsInput {
  accessToken: string;
  locationId: string;
  window: { from: string; to: string };
}

export interface FetchGoogleBusinessMetricsResult {
  series: GoogleBusinessMetricSeriesV1[];
  pagesFetched: number;
  rateLimitHit: boolean;
}

function normalizeLocationId(externalId: string): string {
  const trimmed = externalId.trim();
  return trimmed.startsWith("locations/") ? trimmed : `locations/${trimmed}`;
}

function googleBusinessBaseUrl(version: string): string {
  return `https://businessprofileperformance.googleapis.com/${version}`;
}

function throwGoogleBusinessHttpError(error: unknown): never {
  if (error instanceof HttpClientError) {
    if (error.status === 401) {
      throw new HttpClientError("Google Business authentication failed", 401, error.body);
    }
    if (error.status === 429) {
      throw new RateLimitHttpError(error.message, parseRetryAfterMs({}));
    }
  }
  throw error;
}

/** Cliente Google Business Profile Performance API — mockável via HttpClientPort. */
export class GoogleBusinessClient {
  private readonly apiVersion: string;

  constructor(private readonly config: GoogleBusinessClientConfig) {
    this.apiVersion = config.apiVersion ?? "v1";
  }

  async fetchDailyMetrics(
    input: FetchGoogleBusinessMetricsInput,
  ): Promise<FetchGoogleBusinessMetricsResult> {
    const locationId = normalizeLocationId(input.locationId);
    const baseUrl = `${googleBusinessBaseUrl(this.apiVersion)}/${locationId}:fetchMultiDailyMetricsTimeSeries`;
    let rateLimitHit = false;

    try {
      const response = await this.config.httpClient.request(baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${input.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dailyMetrics: [
            "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
            "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
            "WEBSITE_CLICKS",
          ],
          dailyRange: {
            startDate: parseIsoDate(input.window.from),
            endDate: parseIsoDate(input.window.to),
          },
        }),
      });

      const body = await response.json<GoogleBusinessMetricsResponseV1>();
      const series =
        body.multiDailyMetricTimeSeries?.flatMap((entry) => entry.dailyMetricTimeSeries ?? []) ??
        [];

      return { series, pagesFetched: 1, rateLimitHit };
    } catch (error) {
      if (error instanceof RateLimitHttpError) {
        rateLimitHit = true;
      }
      throwGoogleBusinessHttpError(error);
    }
  }
}

function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}
