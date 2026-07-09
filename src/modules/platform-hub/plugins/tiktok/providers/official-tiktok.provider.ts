import type { ProviderPortV1 } from "../../../../../../contracts/provider/provider.v1";
import type { CredentialAccessPort } from "../../_internal/oauth/credential-access.port";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { createOfficialMetricsProvider } from "../../_internal/provider-framework/create-official-metrics-provider";
import { TikTokClient } from "../api/tiktok-client";
import {
  countDistinctTikTokCampaigns,
  mapTikTokRowsToMetricRows,
} from "../api/tiktok-metrics.mapper";
import { TIKTOK_OAUTH_CREDENTIAL_KEY } from "../tiktok-credential-keys";

/** Label gravado em base_metricas.plataforma — paridade com Make. */
export const TIKTOK_PLATFORM_LABEL = "TikTok";

export interface OfficialTikTokProviderConfig {
  credentialAccess: CredentialAccessPort;
  httpClient: HttpClientPort;
  apiVersion?: string;
}

/** Provider oficial TikTok — produz IngestEnvelope; nunca escreve banco. */
export function createOfficialTikTokProvider(config: OfficialTikTokProviderConfig): ProviderPortV1 {
  const client = new TikTokClient({
    httpClient: config.httpClient,
    apiVersion: config.apiVersion,
  });

  return createOfficialMetricsProvider({
    pluginKey: "tiktok",
    platformLabel: TIKTOK_PLATFORM_LABEL,
    capability: "tiktok:metrics:collect",
    primaryIdentityType: "ad_account",
    credentialAccess: config.credentialAccess,
    credentialKey: TIKTOK_OAUTH_CREDENTIAL_KEY,
    async collectMetrics({ accessToken, identity, window }) {
      const { rows, pagesFetched, rateLimitHit } = await client.fetchCampaignMetrics({
        accessToken,
        adAccountId: identity.externalId,
        window,
      });

      const metricRows = mapTikTokRowsToMetricRows(rows);
      return {
        rows: metricRows,
        campaignsCount: countDistinctTikTokCampaigns(rows),
        metricsCount: metricRows.length,
        pagesFetched,
        rateLimitHit,
      };
    },
  });
}
