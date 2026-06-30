import { describe, expect, it } from "vitest";
import { buildLotsBiMetadataPatch, parseLotsBiMetadata } from "./lots-bi-metadata";

describe("lots-bi-metadata", () => {
  it("parse namespace lots_bi", () => {
    const m = parseLotsBiMetadata({
      full_name: "X",
      lots_bi: { password_set_at: "2025-01-01T00:00:00Z" },
    });
    expect(m.password_set_at).toBe("2025-01-01T00:00:00Z");
  });

  it("build patch preserva existente", () => {
    const patch = buildLotsBiMetadataPatch(
      { onboarding_completed_at: "2025-01-02T00:00:00Z" },
      { lots_bi: { password_set_at: "2025-01-01T00:00:00Z" } },
    );
    expect(patch.lots_bi).toEqual({
      password_set_at: "2025-01-01T00:00:00Z",
      onboarding_completed_at: "2025-01-02T00:00:00Z",
    });
  });
});
