import { describe, expect, it } from "vitest";
import { TiktokAdapter } from "../tiktok.adapter";
import { TIKTOK_MANIFEST } from "../tiktok.manifest";

describe("tiktok conformance: metrics-timeseries", () => {
  it("manifest declara perfil metrics-timeseries", () => {
    expect(TIKTOK_MANIFEST.ingestProfiles).toContain("metrics-timeseries");
  });

  it("adapter supports metrics capability", () => {
    expect(TiktokAdapter.supports("tiktok:metrics:collect")).toBe(true);
  });
});
