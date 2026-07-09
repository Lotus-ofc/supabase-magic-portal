import { describe, expect, it } from "vitest";
import { GoogleBusinessAdapter } from "../google_business.adapter";
import { GOOGLE_BUSINESS_MANIFEST } from "../google_business.manifest";

describe("google_business conformance: metrics-timeseries", () => {
  it("manifest declara perfil metrics-timeseries", () => {
    expect(GOOGLE_BUSINESS_MANIFEST.ingestProfiles).toContain("metrics-timeseries");
  });

  it("adapter supports metrics capability", () => {
    expect(GoogleBusinessAdapter.supports("gbp:metrics:collect")).toBe(true);
  });
});
