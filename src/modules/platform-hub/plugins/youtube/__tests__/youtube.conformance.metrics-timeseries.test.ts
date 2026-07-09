import { describe, expect, it } from "vitest";
import { YoutubeAdapter } from "../youtube.adapter";
import { YOUTUBE_MANIFEST } from "../youtube.manifest";

describe("youtube conformance: metrics-timeseries", () => {
  it("manifest declara perfil metrics-timeseries", () => {
    expect(YOUTUBE_MANIFEST.ingestProfiles).toContain("metrics-timeseries");
  });

  it("adapter supports metrics capability", () => {
    expect(YoutubeAdapter.supports("youtube:metrics:collect")).toBe(true);
  });
});
