import { describe, expect, it } from "vitest";
import { sanitizeOAuthRedirectAfter } from "../sanitize-redirect";

describe("sanitizeOAuthRedirectAfter", () => {
  it("aceita paths internos do admin", () => {
    expect(sanitizeOAuthRedirectAfter("/admin/conexoes/nova?step=4")).toBe(
      "/admin/conexoes/nova?step=4",
    );
    expect(sanitizeOAuthRedirectAfter("/admin/conexoes/abc-uuid")).toBe("/admin/conexoes/abc-uuid");
  });

  it("rejeita URLs externas", () => {
    expect(() => sanitizeOAuthRedirectAfter("https://evil.com/admin")).toThrow();
    expect(() => sanitizeOAuthRedirectAfter("//evil.com/path")).toThrow();
  });

  it("rejeita paths fora do escopo", () => {
    expect(() => sanitizeOAuthRedirectAfter("/dashboard")).toThrow();
  });
});
