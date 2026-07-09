import { describe, expect, it } from "vitest";
import { CREDENTIAL_VAULT_CONTRACT_VERSION } from "../../../../../../contracts/credential/credential-vault.v1";
import { asScopeRef } from "../../../../../../contracts/connection/scope-ref.v1";
import { createConnectionStack } from "@/modules/platform-hub/connections/create-connection-stack";
import { createMetricPipelineStack } from "@/modules/platform-hub/metric-pipeline/create-metric-pipeline-stack";
import { MockHttpClient } from "../../_internal/http/mock-http-client";
import { createCredentialAccess } from "../../_internal/oauth/credential-access.port";
import { YOUTUBE_OAUTH_CREDENTIAL_KEY } from "../youtube-credential-keys";
import { YouTubeOAuthService } from "../oauth/youtube-oauth.service";
import {
  createOfficialYouTubeProvider,
  YOUTUBE_PLATFORM_LABEL,
} from "../providers/official-youtube.provider";

const SAMPLE_REPORT = {
  rows: [{ dimensions: ["2026-07-01"], metrics: [1500, 800] }],
};

function youtubeMock() {
  return new MockHttpClient([
    {
      match: (url) => url.includes("youtubeanalytics.googleapis.com"),
      respond: () => ({ body: SAMPLE_REPORT }),
    },
  ]);
}

describe("OfficialYouTubeProvider", () => {
  it("produz IngestEnvelope compatível com MetricPipeline", async () => {
    const stack = createConnectionStack();
    const connection = await stack.connectionService.create({
      pluginKey: "youtube",
      label: "YouTube official",
      scopeRef: asScopeRef("cadastro:42"),
      activeProviderType: "official_api",
    });

    await stack.identityService.attach({
      connectionId: connection.connectionId,
      identityType: "channel",
      externalId: "UC123456789",
      label: "Channel",
      isPrimary: true,
    });

    await stack.credentialVault.store(connection.connectionId, YOUTUBE_OAUTH_CREDENTIAL_KEY, {
      version: CREDENTIAL_VAULT_CONTRACT_VERSION,
      data: { accessToken: "token-test" },
    });

    const provider = createOfficialYouTubeProvider({
      credentialAccess: createCredentialAccess(stack.credentialVault),
      httpClient: youtubeMock(),
    });

    const envelope = await provider.collect({
      connectionId: connection.connectionId,
      capability: "youtube:metrics:collect",
      identities: await stack.identityService.list(connection.connectionId),
      window: { from: "2026-07-01", to: "2026-07-01" },
    });

    expect(envelope.payload.platformLabel).toBe(YOUTUBE_PLATFORM_LABEL);
    expect(envelope.payload.rows).toHaveLength(2);
    expect(envelope.payload.rows.find((row) => row.metricKey === "views")?.value).toBe(1500);

    const pipeline = createMetricPipelineStack();
    expect((await pipeline.metricPipeline.accept(envelope)).accepted).toBe(true);
  });
});

describe("YouTubeOAuthService", () => {
  it("monta authorization URL com escopos YouTube", () => {
    const stack = createConnectionStack();
    const oauth = new YouTubeOAuthService(
      { clientId: "app-id", clientSecret: "secret" },
      youtubeMock(),
      createCredentialAccess(stack.credentialVault),
    );

    const url = oauth.buildAuthorizationUrl({
      redirectUri: "https://app/callback",
      state: "state-1",
    });

    expect(url).toContain("yt-analytics.readonly");
  });
});
