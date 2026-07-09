import { describe, expect, it } from "vitest";
import { asConnectionId } from "../../../../../../../contracts/connection/connection-id.v1";
import {
  createMakePassiveProvider,
  createOfficialApiStubProvider,
  createMarketingAdapter,
} from "../index";
import { META_ADS_MANIFEST } from "../../../meta_ads/meta_ads.manifest";
import { META_ADS_CAPABILITIES } from "../../../meta_ads/meta_ads.capabilities";

describe("Provider Framework", () => {
  it("MakePassiveProvider — retorna envelope vazio (dual-run)", async () => {
    const provider = createMakePassiveProvider({
      pluginKey: "meta_ads",
      platformLabel: "Meta",
    });

    const envelope = await provider.collect({
      connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
      capability: "meta:metrics:collect",
      identities: [],
    });

    expect(envelope.providerType).toBe("make_passive");
    expect(envelope.payload.rows).toHaveLength(0);
  });

  it("OfficialApiStubProvider — falha explicitamente", async () => {
    const provider = createOfficialApiStubProvider({ pluginKey: "meta_ads" });
    await expect(
      provider.collect({
        connectionId: asConnectionId("00000000-0000-4000-8000-000000000099"),
        capability: "meta:metrics:collect",
        identities: [],
      }),
    ).rejects.toThrow("Official API provider not implemented");
  });

  it("createMarketingAdapter — capability routing + provider selection", () => {
    const adapter = createMarketingAdapter({
      manifest: META_ADS_MANIFEST,
      capabilities: META_ADS_CAPABILITIES,
      platformLabel: "Meta",
    });

    expect(adapter.supports("meta:metrics:collect")).toBe(true);
    expect(adapter.supports("example:metrics:collect")).toBe(false);

    const makePassive = adapter.getProvider("make_passive");
    expect(makePassive.providerType).toBe("make_passive");

    const official = adapter.getProvider("official_api");
    expect(official.providerType).toBe("official_api");
  });
});
