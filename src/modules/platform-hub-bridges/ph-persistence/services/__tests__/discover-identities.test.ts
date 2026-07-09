import { describe, expect, it } from "vitest";
import { MockHttpClient } from "@/modules/platform-hub/plugins/_internal/http/mock-http-client";
import { discoverGa4Identities } from "../ga4-identity-discovery";
import { discoverTikTokIdentities } from "../tiktok-identity-discovery";
import { discoverYouTubeIdentities } from "../youtube-identity-discovery";
import { discoverIdentitiesForPlugin, supportsIdentityDiscovery } from "../discover-identities";

describe("supportsIdentityDiscovery", () => {
  it("inclui as 6 plataformas oficiais", () => {
    expect(supportsIdentityDiscovery("meta_ads")).toBe(true);
    expect(supportsIdentityDiscovery("google_ads")).toBe(true);
    expect(supportsIdentityDiscovery("ga4")).toBe(true);
    expect(supportsIdentityDiscovery("google_business")).toBe(true);
    expect(supportsIdentityDiscovery("tiktok")).toBe(true);
    expect(supportsIdentityDiscovery("youtube")).toBe(true);
    expect(supportsIdentityDiscovery("example")).toBe(false);
  });
});

describe("discoverGa4Identities", () => {
  it("mapeia accountSummaries para property", async () => {
    const http = new MockHttpClient([
      {
        match: (url) => url.includes("accountSummaries"),
        respond: () => ({
          body: {
            accountSummaries: [
              {
                account: "accounts/111",
                displayName: "Conta A",
                propertySummaries: [{ property: "properties/222", displayName: "Site Principal" }],
              },
            ],
          },
        }),
      },
    ]);

    const identities = await discoverGa4Identities(http, "token");
    expect(identities).toEqual([
      { identityType: "account", externalId: "111", label: "Conta A" },
      {
        identityType: "property",
        externalId: "222",
        label: "Site Principal",
        parentLabel: "Conta A",
      },
    ]);
  });
});

describe("discoverTikTokIdentities", () => {
  it("mapeia advertisers para business e ad_account", async () => {
    const http = new MockHttpClient([
      {
        match: (url) => url.includes("advertiser/get"),
        respond: () => ({
          body: {
            code: 0,
            data: {
              list: [
                {
                  advertiser_id: "123",
                  advertiser_name: "Campanha BR",
                  company: "Acme Ltda",
                },
              ],
            },
          },
        }),
      },
    ]);

    const identities = await discoverTikTokIdentities(http, "token");
    expect(identities).toHaveLength(2);
    expect(identities[0]).toMatchObject({ identityType: "business", externalId: "Acme Ltda" });
    expect(identities[1]).toMatchObject({
      identityType: "ad_account",
      externalId: "123",
      label: "Campanha BR",
    });
  });
});

describe("discoverYouTubeIdentities", () => {
  it("mapeia canais do YouTube Data API", async () => {
    const http = new MockHttpClient([
      {
        match: (url) => url.includes("youtube/v3/channels"),
        respond: () => ({
          body: {
            items: [{ id: "UC123", snippet: { title: "Canal Oficial" } }],
          },
        }),
      },
    ]);

    const identities = await discoverYouTubeIdentities(http, "token");
    expect(identities).toEqual([
      { identityType: "channel", externalId: "UC123", label: "Canal Oficial" },
    ]);
  });
});

describe("discoverIdentitiesForPlugin", () => {
  it("rejeita plataforma sem descoberta", async () => {
    const http = new MockHttpClient([]);
    await expect(discoverIdentitiesForPlugin(http, "example", "token")).rejects.toThrow(
      /não disponível/,
    );
  });
});
