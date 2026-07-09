import { describe, expect, it } from "vitest";
import { Ga4Adapter } from "../ga4.adapter";
import { GA4_MANIFEST } from "../ga4.manifest";

describe("ga4 conformance: metrics-timeseries", () => {
  it("manifest declara perfil metrics-timeseries", () => {
    expect(GA4_MANIFEST.ingestProfiles).toContain("metrics-timeseries");
  });

  it("adapter supports metrics capability", () => {
    expect(Ga4Adapter.supports("ga4:metrics:collect")).toBe(true);
  });
});
