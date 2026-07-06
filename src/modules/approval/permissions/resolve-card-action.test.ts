import { describe, expect, it } from "vitest";
import { assertCardAction, resolveCardAction } from "./resolve-card-action";

describe("resolve-card-action", () => {
  it("allows permitted actions", () => {
    expect(resolveCardAction({ role: "cliente", action: "approve" })).toBe(true);
    expect(resolveCardAction({ role: "social_media", action: "move" })).toBe(true);
  });

  it("denies forbidden actions", () => {
    expect(resolveCardAction({ role: "cliente", action: "edit" })).toBe(false);
  });

  it("assertCardAction throws when forbidden", () => {
    expect(() => assertCardAction({ role: "cliente", action: "delete" })).toThrow(/Forbidden/);
  });
});
