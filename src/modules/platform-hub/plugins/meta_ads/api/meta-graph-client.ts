import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { HttpClientError } from "../../_internal/http/http-client.port";
import { parseRetryAfterMs, RateLimitHttpError } from "../../_internal/http/fetch-http-client";
import { paginateCursorPages } from "../../_internal/http/paginate-cursor";
import type { MetaInsightsResponseV1 } from "./meta-api.types";

export interface MetaGraphClientConfig {
  httpClient: HttpClientPort;
  graphVersion?: string;
}

export interface FetchCampaignInsightsInput {
  accessToken: string;
  adAccountId: string;
  window: { from: string; to: string };
  maxPages?: number;
}

export interface FetchCampaignInsightsResult {
  insights: MetaInsightsResponseV1["data"];
  pagesFetched: number;
  rateLimitHit: boolean;
}

function normalizeAdAccountId(externalId: string): string {
  const trimmed = externalId.trim();
  return trimmed.startsWith("act_") ? trimmed : `act_${trimmed}`;
}

function graphBaseUrl(version: string): string {
  return `https://graph.facebook.com/${version}`;
}

function throwMetaHttpError(error: unknown): never {
  if (error instanceof HttpClientError) {
    if (error.status === 401) {
      throw new HttpClientError("Meta authentication failed", 401, error.body);
    }
    if (error.status === 429) {
      throw new RateLimitHttpError(error.message, parseRetryAfterMs({}));
    }
  }
  throw error;
}

/** Cliente Graph API — mockável via HttpClientPort. */
export class MetaGraphClient {
  private readonly graphVersion: string;

  constructor(private readonly config: MetaGraphClientConfig) {
    this.graphVersion = config.graphVersion ?? "v22.0";
  }

  async fetchCampaignInsights(
    input: FetchCampaignInsightsInput,
  ): Promise<FetchCampaignInsightsResult> {
    const accountId = normalizeAdAccountId(input.adAccountId);
    const baseUrl = `${graphBaseUrl(this.graphVersion)}/${accountId}/insights`;
    let rateLimitHit = false;

    const { items, pagesFetched } = await paginateCursorPages({
      maxPages: input.maxPages,
      fetchPage: async (after) => {
        try {
          const response = await this.config.httpClient.request(baseUrl, {
            searchParams: {
              access_token: input.accessToken,
              level: "campaign",
              time_increment: "1",
              fields: "campaign_name,campaign_id,impressions,reach,clicks,spend",
              time_range: JSON.stringify({ since: input.window.from, until: input.window.to }),
              limit: "100",
              after,
            },
          });

          const body = await response.json<MetaInsightsResponseV1>();
          return {
            data: body.data ?? [],
            nextCursor: body.paging?.cursors?.after,
          };
        } catch (error) {
          if (error instanceof RateLimitHttpError) {
            rateLimitHit = true;
          }
          throwMetaHttpError(error);
        }
      },
    });

    return { insights: items, pagesFetched, rateLimitHit };
  }
}
