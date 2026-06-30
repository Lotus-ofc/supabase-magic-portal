import { describe, expect, it } from "vitest";
import { normalizeLifecycleStatus } from "./lifecycle-normalize";

describe("normalizeLifecycleStatus", () => {
  it("mapeia invite_expired legado para invite_pending", () => {
    expect(normalizeLifecycleStatus("invite_expired")).toBe("invite_pending");
  });

  it("preserva estados do contrato", () => {
    expect(normalizeLifecycleStatus("active")).toBe("active");
  });
});
