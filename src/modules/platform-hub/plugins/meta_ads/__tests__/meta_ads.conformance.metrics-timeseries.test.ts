import { describe, expect, it } from "vitest";
import { MetaAdsAdapter } from "../meta_ads.adapter";
import { META_ADS_MANIFEST } from "../meta_ads.manifest";

describe("meta_ads conformance: metrics-timeseries", () => {
  it("manifest declara perfil metrics-timeseries", () => {
    expect(META_ADS_MANIFEST.ingestProfiles).toContain("metrics-timeseries");
  });

  it("adapter supports metrics capability", () => {
    expect(MetaAdsAdapter.supports("meta:metrics:collect")).toBe(true);
  });

  it("make_passive retorna envelope vazio via framework", async () => {
    const provider = MetaAdsAdapter.getProvider("make_passive");
    const envelope = await provider.collect({
      connectionId: "00000000-0000-4000-8000-000000000099" as never,
      capability: "meta:metrics:collect",
      identities: [],
    });
    expect(envelope.profile).toBe("metrics-timeseries");
    expect(envelope.payload.rows).toHaveLength(0);
  });
});
