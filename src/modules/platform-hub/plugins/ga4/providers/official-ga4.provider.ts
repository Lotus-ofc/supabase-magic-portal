import type { ProviderPortV1 } from "../../../../../../contracts/provider/provider.v1";
import type { CredentialAccessPort } from "../../_internal/oauth/credential-access.port";
import type { HttpClientPort } from "../../_internal/http/http-client.port";
import { createOfficialMetricsProvider } from "../../_internal/provider-framework/create-official-metrics-provider";
import { Ga4Client } from "../api/ga4-client";
import { countGa4ReportDays, mapGa4RowsToMetricRows } from "../api/ga4-metrics.mapper";
import { GA4_OAUTH_CREDENTIAL_KEY } from "../ga4-credential-keys";

/** Label gravado em base_metricas.plataforma — paridade com Make. */
export const GA4_PLATFORM_LABEL = "GA4";

export interface OfficialGa4ProviderConfig {
  credentialAccess: CredentialAccessPort;
  httpClient: HttpClientPort;
  apiVersion?: string;
}

/** Provider oficial GA4 — produz IngestEnvelope; nunca escreve banco. */
export function createOfficialGa4Provider(config: OfficialGa4ProviderConfig): ProviderPortV1 {
  const client = new Ga4Client({
    httpClient: config.httpClient,
    apiVersion: config.apiVersion,
  });

  return createOfficialMetricsProvider({
    pluginKey: "ga4",
    platformLabel: GA4_PLATFORM_LABEL,
    capability: "ga4:metrics:collect",
    primaryIdentityType: "property",
    credentialAccess: config.credentialAccess,
    credentialKey: GA4_OAUTH_CREDENTIAL_KEY,
    async collectMetrics({ accessToken, identity, window }) {
      const { rows, pagesFetched, rateLimitHit } = await client.fetchDailyMetrics({
        accessToken,
        propertyId: identity.externalId,
        window,
      });

      const metricRows = mapGa4RowsToMetricRows(rows);
      return {
        rows: metricRows,
        campaignsCount: countGa4ReportDays(rows),
        metricsCount: metricRows.length,
        pagesFetched,
        rateLimitHit,
      };
    },
  });
}
