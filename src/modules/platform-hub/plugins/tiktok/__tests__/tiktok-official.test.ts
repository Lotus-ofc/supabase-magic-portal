import { describe, expect, it } from "vitest";
import { CREDENTIAL_VAULT_CONTRACT_VERSION } from "../../../../../../contracts/credential/credential-vault.v1";
import { asScopeRef } from "../../../../../../contracts/connection/scope-ref.v1";
import { createConnectionStack } from "@/modules/platform-hub/connections/create-connection-stack";
import { createMetricPipelineStack } from "@/modules/platform-hub/metric-pipeline/create-metric-pipeline-stack";
import { MockHttpClient } from "../../_internal/http/mock-http-client";
import { createCredentialAccess } from "../../_internal/oauth/credential-access.port";
import { TIKTOK_OAUTH_CREDENTIAL_KEY } from "../tiktok-credential-keys";
import { TikTokOAuthService } from "../oauth/tiktok-oauth.service";
import {
  createOfficialTikTokProvider,
  TIKTOK_PLATFORM_LABEL,
} from "../providers/official-tiktok.provider";

const SAMPLE_REPORT = {
  data: {
    list: [
      {
        dimensions: { campaign_name: "Campanha A", stat_time_day: "2026-07-01" },
        metrics: { impressions: "1000", spend: "30.5" },
      },
    ],
    page_info: { page: 1, total_page: 1 },
  },
  code: 0,
};

function tiktokMock() {
  return new MockHttpClient([
    {
      match: (url) => url.includes("/report/integrated/get"),
      respond: () => ({ body: SAMPLE_REPORT }),
    },
  ]);
}

describe("OfficialTikTokProvider", () => {
  it("produz IngestEnvelope compatível com MetricPipeline", async () => {
    const stack = createConnectionStack();
    const connection = await stack.connectionService.create({
      pluginKey: "tiktok",
      label: "TikTok official",
      scopeRef: asScopeRef("cadastro:42"),
      activeProviderType: "official_api",
    });

    await stack.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "ad_account",
      externalId: "7123456789",
      label: "Ad Account",
      isPrimary: true,
    });

    await stack.credentialVault.store(connection.connectionId, TIKTOK_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "token-test" },
    });

    const provider = createOfficialTikTokProvider({
      credentialAccess: createCredentialAccess(stack.credentialVault),
      httpClient: tiktokMock(),
    });

    const envelope = await provider.collect({
      connectionId: connection.connectionId,
      capability: "tiktok:metrics:collect",
      identities: await stack.identityService.list(connection.connectionId),
      window: { from: "2026-07-01", to: "2026-07-01" },
    });

    expect(envelope.payload.platformLabel).toBe(TIKTOK_PLATFORM_LABEL);
    expect(envelope.payload.rows).toHaveLength(2);

    const pipeline = createMetricPipelineStack();
    expect((await pipeline.metricPipeline.accept(envelope)).accepted).toBe(true);
  });
});

describe("TikTokOAuthService", () => {
  it("monta authorization URL com escopos", () => {
    const stack = createConnectionStack();
    const oauth = new TikTokOAuthService(
      { appId: "app-id", appSecret: "secret" },
      tiktokMock(),
      createCredentialAccess(stack.credentialVault),
    );

    const url = oauth.buildAuthorizationUrl({
      redirectUri: "https://app/callback",
      state: "state-1",
    });

    expect(url).toContain("app_id=app-id");
    expect(url).toContain("ads.read");
  });
});
