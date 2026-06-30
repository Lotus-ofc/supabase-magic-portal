import { describe, expect, it } from "vitest";
import {
  buildCallbackForwardSearch,
  hasLegacyAuthTokensOnAuthRoute,
  parseAuthCallbackParams,
  resolvePostCallbackRedirect,
} from "./auth-callback";

describe("auth-callback", () => {
  it("parseia token_hash e type da query", () => {
    const search = new URLSearchParams("token_hash=abc&type=invite");
    const params = parseAuthCallbackParams(search, new URLSearchParams());
    expect(params.token_hash).toBe("abc");
    expect(params.type).toBe("invite");
  });

  it("parseia code PKCE", () => {
    const search = new URLSearchParams("code=pkce-code");
    const params = parseAuthCallbackParams(search, new URLSearchParams());
    expect(params.code).toBe("pkce-code");
  });

  it("detecta tokens legados em /auth", () => {
    expect(hasLegacyAuthTokensOnAuthRoute(new URLSearchParams("token_hash=x"))).toBe(true);
    expect(hasLegacyAuthTokensOnAuthRoute(new URLSearchParams("view=login"))).toBe(false);
  });

  it("encaminha query para callback", () => {
    const qs = buildCallbackForwardSearch(new URLSearchParams("token_hash=t&type=recovery"));
    expect(qs).toBe("?token_hash=t&type=recovery");
  });

  it("resolve redirect pós-callback", () => {
    expect(resolvePostCallbackRedirect("invite")).toEqual({
      view: "set-password",
      context: "invite",
    });
    expect(resolvePostCallbackRedirect("recovery")).toEqual({
      view: "set-password",
      context: "recovery",
    });
    expect(resolvePostCallbackRedirect(null)).toEqual({ view: "login" });
  });
});
