import { describe, expect, it } from "vitest";
import {
  buildAuthCallbackUrl,
  buildAuthInviteRedirectUrl,
  isLocalhostUrl,
  normalizeAppUrl,
} from "./app-url";

describe("app-url", () => {
  it("normaliza barra final", () => {
    expect(normalizeAppUrl("https://portal.exemplo.com/")).toBe("https://portal.exemplo.com");
  });

  it("rejeita URL sem protocolo", () => {
    expect(() => normalizeAppUrl("portal.exemplo.com")).toThrow(/http/i);
  });

  it("detecta localhost", () => {
    expect(isLocalhostUrl("http://localhost:5173")).toBe(true);
    expect(isLocalhostUrl("https://portal.exemplo.com")).toBe(false);
  });

  it("monta redirect de callback auth", () => {
    expect(buildAuthCallbackUrl("https://portal.exemplo.com")).toBe(
      "https://portal.exemplo.com/auth/callback",
    );
    expect(buildAuthInviteRedirectUrl("https://portal.exemplo.com")).toBe(
      "https://portal.exemplo.com/auth/callback",
    );
  });
});
