import { describe, expect, it } from "vitest";
import { CREDENTIAL_VAULT_CONTRACT_VERSION } from "../../../../../../contracts/credential/credential-vault.v1";
import { asScopeRef } from "../../../../../../contracts/connection/scope-ref.v1";
import { createConnectionStack } from "@/modules/platform-hub/connections/create-connection-stack";
import { createMetricPipelineStack } from "@/modules/platform-hub/metric-pipeline/create-metric-pipeline-stack";
import { MockHttpClient } from "../../_internal/http/mock-http-client";
import { createCredentialAccess } from "../../_internal/oauth/credential-access.port";
import { GOOGLE_ADS_OAUTH_CREDENTIAL_KEY } from "../google-ads-credential-keys";
import { GoogleAdsOAuthService } from "../oauth/google-ads-oauth.service";
import {
  createOfficialGoogleAdsProvider,
  GOOGLE_ADS_PLATFORM_LABEL,
} from "../providers/official-google-ads.provider";
import { HttpClientError } from "../../_internal/http/http-client.port";

const SAMPLE_ROWS = {
  results: [
    {
      campaign: { id: "1", name: "Campanha A" },
      segments: { date: "2026-07-01" },
      metrics: { impressions: "1000", clicks: "50", costMicros: "25500000" },
    },
  ],
};

function googleAdsMock() {
  return new MockHttpClient([
    {
      match: (url) => url.includes("googleAds:search"),
      respond: () => ({ body: SAMPLE_ROWS }),
    },
  ]);
}

describe("OfficialGoogleAdsProvider", () => {
  it("produz IngestEnvelope compatível com MetricPipeline", async () => {
    const stack = createConnectionStack();
    const connection = await stack.connectionService.create({
      pluginKey: "google_ads",
      label: "Google Ads official",
      scopeRef: asScopeRef("cadastro:42"),
      activeProviderType: "official_api",
    });

    await stack.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "customer",
      externalId: "1234567890",
      label: "Customer",
      isPrimary: true,
    });

    await stack.credentialVault.store(connection.connectionId, GOOGLE_ADS_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "token-test" },
    });

    const provider = createOfficialGoogleAdsProvider({
      credentialAccess: createCredentialAccess(stack.credentialVault),
      httpClient: googleAdsMock(),
    });

    const envelope = await provider.collect({
      connectionId: connection.connectionId,
      capability: "google_ads:metrics:collect",
      identities: await stack.identityService.list(connection.connectionId),
      window: { from: "2026-07-01", to: "2026-07-01" },
    });

    expect(envelope.profile).toBe("metrics-timeseries");
    expect(envelope.payload.platformLabel).toBe(GOOGLE_ADS_PLATFORM_LABEL);
    expect(envelope.payload.rows).toHaveLength(3);
    expect(envelope.payload.rows.find((row) => row.metricKey === "spend")?.value).toBe(25.5);

    const pipeline = createMetricPipelineStack();
    const pipelineResult = await pipeline.metricPipeline.accept(envelope);
    expect(pipelineResult.accepted).toBe(true);
  });

  it("falha autenticação quando token ausente", async () => {
    const stack = createConnectionStack();
    const provider = stack.registry.getPlugin("google_ads").adapter.getProvider("official_api");

    await expect(
      provider.collect({
        connectionId: "00000000-0000-4000-8000-000000000021" as never,
        capability: "google_ads:metrics:collect",
        identities: [
          {
            version: "1.0.0",
            connectionId: "00000000-0000-4000-8000-000000000021" as never,
            identityType: "customer",
            externalId: "123",
            label: "Customer",
            isPrimary: true,
          },
        ],
      }),
    ).rejects.toThrow(/access token not found/i);
  });

  it("propaga erro 401 da Google Ads API", async () => {
    const httpClient = new MockHttpClient([
      {
        match: (url) => url.includes("googleAds:search"),
        respond: () => ({ status: 401, body: { error: { message: "Unauthorized" } } }),
      },
    ]);

    const stack = createConnectionStack();
    const provider = createOfficialGoogleAdsProvider({
      credentialAccess: createCredentialAccess(stack.credentialVault),
      httpClient,
    });

    const connectionId = "00000000-0000-4000-8000-000000000022" as never;
    await stack.credentialVault.store(connectionId, GOOGLE_ADS_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "bad-token" },
    });

    await expect(
      provider.collect({
        connectionId,
        capability: "google_ads:metrics:collect",
        identities: [
          {
            version: "1.0.0",
            connectionId,
            identityType: "customer",
            externalId: "123",
            label: "Customer",
            isPrimary: true,
          },
        ],
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("GoogleAdsOAuthService", () => {
  it("monta authorization URL com escopos", () => {
    const stack = createConnectionStack();
    const oauth = new GoogleAdsOAuthService(
      { clientId: "app-id", clientSecret: "secret" },
      googleAdsMock(),
      createCredentialAccess(stack.credentialVault),
    );

    const url = oauth.buildAuthorizationUrl({
      redirectUri: "https://app/callback",
      state: "state-1",
    });

    expect(url).toContain("client_id=app-id");
    expect(url).toContain("adwords");
  });

  it("exchange code persiste token no vault", async () => {
    const httpClient = new MockHttpClient([
      {
        match: (url) => url.includes("oauth2.googleapis.com/token"),
        respond: () => ({
          body: {
            access_token: "access",
            refresh_token: "refresh",
            token_type: "Bearer",
            expires_in: 3600,
          },
        }),
      },
    ]);

    const stack = createConnectionStack();
    const oauth = new GoogleAdsOAuthService(
      { clientId: "app-id", clientSecret: "secret" },
      httpClient,
      createCredentialAccess(stack.credentialVault),
    );

    const connectionId = "00000000-0000-4000-8000-000000000023" as never;
    const bundle = await oauth.exchangeCodeForToken({
      connectionId,
      code: "auth-code",
      redirectUri: "https://app/callback",
    });

    expect(bundle.accessToken).toBe("access");
    const stored = await stack.credentialVault.retrieve(
      connectionId,
      GOOGLE_ADS_OAUTH_CREDENTIAL_KEY,
    );
    expect(stored?.data.accessToken).toBe("access");
  });
});
