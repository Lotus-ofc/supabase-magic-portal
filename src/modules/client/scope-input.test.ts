import { describe, expect, it } from "vitest";
import { scopeQueryKeyFromInput } from "./scope-input";

describe("client portal scope", () => {
  it("builds stable query keys per mode", () => {
    expect(scopeQueryKeyFromInput({ mode: "client_access" })).toBe("client_access");
    expect(scopeQueryKeyFromInput({ mode: "slug_context", slug: "rafa-teo" })).toBe(
      "slug:rafa-teo",
    );
  });
});
