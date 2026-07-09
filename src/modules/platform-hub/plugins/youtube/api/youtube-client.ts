import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { HttpClientError } from "../../_internal/http/http-client.port";
import { parseRetryAfterMs, RateLimitHttpError } from "../../_internal/http/fetch-http-client";
import { paginateCursorPages } from "../../_internal/http/paginate-cursor";
import type { YouTubeAnalyticsResponseV1, YouTubeAnalyticsRowV1 } from "./youtube-api.types";

export interface YouTubeClientConfig {
  httpClient: HttpClientPort;
  apiVersion?: string;
}

export interface FetchYouTubeMetricsInput {
  accessToken: string;
  channelId: string;
  window: { from: string; to: string };
  maxPages?: number;
}

export interface FetchYouTubeMetricsResult {
  rows: YouTubeAnalyticsRowV1[];
  pagesFetched: number;
  rateLimitHit: boolean;
}

function youtubeAnalyticsBaseUrl(version: string): string {
  return `https://youtubeanalytics.googleapis.com/${version}`;
}

function throwYouTubeHttpError(error: unknown): never {
  if (error instanceof HttpClientError) {
    if (error.status === 401) {
      throw new HttpClientError("YouTube authentication failed", 401, error.body);
    }
    if (error.status === 429) {
      throw new RateLimitHttpError(error.message, parseRetryAfterMs({}));
    }
  }
  throw error;
}

/** Cliente YouTube Analytics API — mockável via HttpClientPort. */
export class YouTubeClient {
  private readonly apiVersion: string;

  constructor(private readonly config: YouTubeClientConfig) {
    this.apiVersion = config.apiVersion ?? "v2";
  }

  async fetchChannelMetrics(input: FetchYouTubeMetricsInput): Promise<FetchYouTubeMetricsResult> {
    const baseUrl = `${youtubeAnalyticsBaseUrl(this.apiVersion)}/reports`;
    let rateLimitHit = false;

    const { items, pagesFetched } = await paginateCursorPages({
      maxPages: input.maxPages,
      fetchPage: async (pageToken) => {
        try {
          const response = await this.config.httpClient.request(baseUrl, {
            headers: { Authorization: `Bearer ${input.accessToken}` },
            searchParams: {
              ids: `channel==${input.channelId}`,
              startDate: input.window.from,
              endDate: input.window.to,
              dimensions: "day",
              metrics: "views,annotationImpressions",
              pageToken,
            },
          });

          const body = await response.json<YouTubeAnalyticsResponseV1>();
          return {
            data: body.rows ?? [],
            nextCursor: body.nextPageToken,
          };
        } catch (error) {
          if (error instanceof RateLimitHttpError) {
            rateLimitHit = true;
          }
          throwYouTubeHttpError(error);
        }
      },
    });

    return { rows: items, pagesFetched, rateLimitHit };
  }
}
