import { describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";
import {
  hasLegacyAuthTokensOnAuthRoute,
  parseAuthCallbackParams,
  resolveCallbackFlow,
  resolvePostCallbackRedirect,
} from "./auth-callback";

function session(partial: Partial<Session["user"]>): Session {
  return {
    access_token: "t",
    user: { id: "u1", ...partial } as Session["user"],
  } as Session;
}

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

  it("resolve redirect pós-callback", () => {
    expect(resolvePostCallbackRedirect("invite")).toEqual({
      view: "set-password",
      context: "invite",
    });
    expect(resolvePostCallbackRedirect("recovery")).toEqual({
      view: "set-password",
      context: "recovery",
    });
    expect(resolvePostCallbackRedirect("login")).toEqual({ view: "login" });
  });

  it("parseia type do hash implicit", () => {
    const hash = new URLSearchParams("access_token=abc&type=invite");
    const params = parseAuthCallbackParams(new URLSearchParams(), hash);
    expect(params.type).toBe("invite");
  });

  it("resolveCallbackFlow usa type recovery", () => {
    expect(resolveCallbackFlow("recovery", session({ user_metadata: {} }))).toBe("recovery");
  });

  it("resolveCallbackFlow usa redirectType PKCE recovery", () => {
    expect(resolveCallbackFlow(null, session({ user_metadata: {} }), "recovery")).toBe("recovery");
  });

  it("resolveCallbackFlow usa invited_at quando type sumiu", () => {
    expect(
      resolveCallbackFlow(null, session({ invited_at: "2025-01-02T00:00:00Z", user_metadata: {} })),
    ).toBe("invite");
  });

  it("resolveCallbackFlow cai em login sem sinais de convite", () => {
    expect(resolveCallbackFlow(null, session({ user_metadata: {} }))).toBe("login");
  });
});
