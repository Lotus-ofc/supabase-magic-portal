import { describe, expect, it } from "vitest";
import { GoogleAdsAdapter } from "../google_ads.adapter";
import { GOOGLE_ADS_MANIFEST } from "../google_ads.manifest";

describe("google_ads conformance: metrics-timeseries", () => {
  it("manifest declara perfil metrics-timeseries", () => {
    expect(GOOGLE_ADS_MANIFEST.ingestProfiles).toContain("metrics-timeseries");
  });

  it("adapter supports metrics capability", () => {
    expect(GoogleAdsAdapter.supports("google_ads:metrics:collect")).toBe(true);
  });
});
