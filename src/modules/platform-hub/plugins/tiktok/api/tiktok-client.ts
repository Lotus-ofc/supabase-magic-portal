import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { HttpClientError } from "../../_internal/http/http-client.port";
import { parseRetryAfterMs, RateLimitHttpError } from "../../_internal/http/fetch-http-client";
import type { TikTokReportResponseV1, TikTokReportRowV1 } from "./tiktok-api.types";

export interface TikTokClientConfig {
  httpClient: HttpClientPort;
  apiVersion?: string;
}

export interface FetchTikTokMetricsInput {
  accessToken: string;
  adAccountId: string;
  window: { from: string; to: string };
  maxPages?: number;
}

export interface FetchTikTokMetricsResult {
  rows: TikTokReportRowV1[];
  pagesFetched: number;
  rateLimitHit: boolean;
}

function tiktokBaseUrl(version: string): string {
  return `https://business-api.tiktok.com/open_api/${version}`;
}

function throwTikTokHttpError(error: unknown): never {
  if (error instanceof HttpClientError) {
    if (error.status === 401) {
      throw new HttpClientError("TikTok authentication failed", 401, error.body);
    }
    if (error.status === 429) {
      throw new RateLimitHttpError(error.message, parseRetryAfterMs({}));
    }
  }
  throw error;
}

/** Cliente TikTok Marketing API — mockável via HttpClientPort. */
export class TikTokClient {
  private readonly apiVersion: string;

  constructor(private readonly config: TikTokClientConfig) {
    this.apiVersion = config.apiVersion ?? "v1.3";
  }

  async fetchCampaignMetrics(input: FetchTikTokMetricsInput): Promise<FetchTikTokMetricsResult> {
    const baseUrl = `${tiktokBaseUrl(this.apiVersion)}/report/integrated/get/`;
    let rateLimitHit = false;
    const rows: TikTokReportRowV1[] = [];
    let page = 1;
    let pagesFetched = 0;
    const maxPages = input.maxPages ?? 50;

    while (pagesFetched < maxPages) {
      try {
        const response = await this.config.httpClient.request(baseUrl, {
          method: "GET",
          headers: { "Access-Token": input.accessToken },
          searchParams: {
            advertiser_id: input.adAccountId,
            report_type: "BASIC",
            data_level: "AUCTION_CAMPAIGN",
            dimensions: JSON.stringify(["campaign_name", "stat_time_day"]),
            metrics: JSON.stringify(["impressions", "spend"]),
            start_date: input.window.from,
            end_date: input.window.to,
            page: String(page),
            page_size: "100",
          },
        });

        const body = await response.json<TikTokReportResponseV1>();
        rows.push(...(body.data?.list ?? []));
        pagesFetched += 1;

        const totalPage = body.data?.page_info?.total_page ?? page;
        if (page >= totalPage) break;
        page += 1;
      } catch (error) {
        if (error instanceof RateLimitHttpError) {
          rateLimitHit = true;
        }
        throwTikTokHttpError(error);
      }
    }

    return { rows, pagesFetched, rateLimitHit };
  }
}
