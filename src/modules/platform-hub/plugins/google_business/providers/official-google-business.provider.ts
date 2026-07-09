import type { ProviderPortV1 } from "../../../../../../contracts/provider/provider.v1";
import type { CredentialAccessPort } from "../../_internal/oauth/credential-access.port";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { createOfficialMetricsProvider } from "../../_internal/provider-framework/create-official-metrics-provider";
import { GoogleBusinessClient } from "../api/google-business-client";
import {
  countGoogleBusinessDays,
  mapGoogleBusinessSeriesToMetricRows,
} from "../api/google-business-metrics.mapper";
import { GOOGLE_BUSINESS_OAUTH_CREDENTIAL_KEY } from "../google-business-credential-keys";

/** Label gravado em base_metricas.plataforma — paridade com Make. */
export const GOOGLE_BUSINESS_PLATFORM_LABEL = "Google Business";

export interface OfficialGoogleBusinessProviderConfig {
  credentialAccess: CredentialAccessPort;
  httpClient: HttpClientPort;
  apiVersion?: string;
}

/** Provider oficial Google Business — produz IngestEnvelope; nunca escreve banco. */
export function createOfficialGoogleBusinessProvider(
  config: OfficialGoogleBusinessProviderConfig,
): ProviderPortV1 {
  const client = new GoogleBusinessClient({
    httpClient: config.httpClient,
    apiVersion: config.apiVersion,
  });

  return createOfficialMetricsProvider({
    pluginKey: "google_business",
    platformLabel: GOOGLE_BUSINESS_PLATFORM_LABEL,
    capability: "gbp:metrics:collect",
    primaryIdentityType: "location",
    credentialAccess: config.credentialAccess,
    credentialKey: GOOGLE_BUSINESS_OAUTH_CREDENTIAL_KEY,
    async collectMetrics({ accessToken, identity, window }) {
      const { series, pagesFetched, rateLimitHit } = await client.fetchDailyMetrics({
        accessToken,
        locationId: identity.externalId,
        window,
      });

      const metricRows = mapGoogleBusinessSeriesToMetricRows(series);
      return {
        rows: metricRows,
        campaignsCount: countGoogleBusinessDays(series),
        metricsCount: metricRows.length,
        pagesFetched,
        rateLimitHit,
      };
    },
  });
}
