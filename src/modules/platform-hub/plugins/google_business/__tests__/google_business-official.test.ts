import { describe, expect, it } from "vitest";
import { CREDENTIAL_VAULT_CONTRACT_VERSION } from "../../../../../../contracts/credential/credential-vault.v1";
import { asScopeRef } from "../../../../../../contracts/connection/scope-ref.v1";
import { createConnectionStack } from "@/modules/platform-hub/connections/create-connection-stack";
import { createMetricPipelineStack } from "@/modules/platform-hub/metric-pipeline/create-metric-pipeline-stack";
import { MockHttpClient } from "../../_internal/http/mock-http-client";
import { createCredentialAccess } from "../../_internal/oauth/credential-access.port";
import { GOOGLE_BUSINESS_OAUTH_CREDENTIAL_KEY } from "../google-business-credential-keys";
import {
  createOfficialGoogleBusinessProvider,
  GOOGLE_BUSINESS_PLATFORM_LABEL,
} from "../providers/official-google-business.provider";

const SAMPLE_METRICS = {
  multiDailyMetricTimeSeries: [
    {
      dailyMetricTimeSeries: [
        {
          dailyMetric: "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
          dailyValues: [{ date: { year: 2026, month: 7, day: 1 }, value: "100" }],
        },
        {
          dailyMetric: "WEBSITE_CLICKS",
          dailyValues: [{ date: { year: 2026, month: 7, day: 1 }, value: "10" }],
        },
      ],
    },
  ],
};

function gbpMock() {
  return new MockHttpClient([
    {
      match: (url) => url.includes("fetchMultiDailyMetricsTimeSeries"),
      respond: () => ({ body: SAMPLE_METRICS }),
    },
  ]);
}

describe("OfficialGoogleBusinessProvider", () => {
  it("produz IngestEnvelope compatível com MetricPipeline", async () => {
    const stack = createConnectionStack();
    const connection = await stack.connectionService.create({
      pluginKey: "google_business",
      label: "GBP official",
      scopeRef: asScopeRef("cadastro:42"),
      activeProviderType: "official_api",
    });

    await stack.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "location",
      externalId: "123456789",
      label: "Location",
      isPrimary: true,
    });

    await stack.credentialVault.store(
      connection.connectionId,
      GOOGLE_BUSINESS_OAUTH_CREDENTIAL_KEY,
      {
        version: CREDENTIAL_VAULT_CONTRACT_VERSION,
        data: { accessToken: "token-test" },
      },
    );

    const provider = createOfficialGoogleBusinessProvider({
      credentialAccess: createCredentialAccess(stack.credentialVault),
      httpClient: gbpMock(),
    });

    const envelope = await provider.collect({
      connectionId: connection.connectionId,
      capability: "gbp:metrics:collect",
      identities: await stack.identityService.list(connection.connectionId),
      window: { from: "2026-07-01", to: "2026-07-01" },
    });

    expect(envelope.payload.platformLabel).toBe(GOOGLE_BUSINESS_PLATFORM_LABEL);
    expect(envelope.payload.rows).toHaveLength(2);

    const pipeline = createMetricPipelineStack();
    expect((await pipeline.metricPipeline.accept(envelope)).accepted).toBe(true);
  });
});
