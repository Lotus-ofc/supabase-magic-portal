import type { ProviderPortV1 } from "../../../../../../contracts/provider/provider.v1";
import type { CredentialAccessPort } from "../../_internal/oauth/credential-access.port";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { createOfficialMetricsProvider } from "../../_internal/provider-framework/create-official-metrics-provider";
import { YouTubeClient } from "../api/youtube-client";
import { countYouTubeReportDays, mapYouTubeRowsToMetricRows } from "../api/youtube-metrics.mapper";
import { YOUTUBE_OAUTH_CREDENTIAL_KEY } from "../youtube-credential-keys";

/** Label gravado em base_metricas.plataforma — paridade com Make. */
export const YOUTUBE_PLATFORM_LABEL = "YouTube";

export interface OfficialYouTubeProviderConfig {
  credentialAccess: CredentialAccessPort;
  httpClient: HttpClientPort;
  apiVersion?: string;
}

/** Provider oficial YouTube — produz IngestEnvelope; nunca escreve banco. */
export function createOfficialYouTubeProvider(
  config: OfficialYouTubeProviderConfig,
): ProviderPortV1 {
  const client = new YouTubeClient({
    httpClient: config.httpClient,
    apiVersion: config.apiVersion,
  });

  return createOfficialMetricsProvider({
    pluginKey: "youtube",
    platformLabel: YOUTUBE_PLATFORM_LABEL,
    capability: "youtube:metrics:collect",
    primaryIdentityType: "channel",
    credentialAccess: config.credentialAccess,
    credentialKey: YOUTUBE_OAUTH_CREDENTIAL_KEY,
    async collectMetrics({ accessToken, identity, window }) {
      const { rows, pagesFetched, rateLimitHit } = await client.fetchChannelMetrics({
        accessToken,
        channelId: identity.externalId,
        window,
      });

      const metricRows = mapYouTubeRowsToMetricRows(rows);
      return {
        rows: metricRows,
        campaignsCount: countYouTubeReportDays(rows),
        metricsCount: metricRows.length,
        pagesFetched,
        rateLimitHit,
      };
    },
  });
}
