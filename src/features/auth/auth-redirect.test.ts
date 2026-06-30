import { describe, expect, it } from "vitest";
import { resolveAccessBlockedRedirect, resolvePostAuthPath } from "./auth-redirect";

describe("auth-redirect", () => {
  it("envia admin para /admin e cliente para /dashboard", () => {
    expect(resolvePostAuthPath(true)).toBe("/admin");
    expect(resolvePostAuthPath(false)).toBe("/dashboard");
  });

  it("respeita redirect interno seguro", () => {
    expect(resolvePostAuthPath(false, "/aprovacoes")).toBe("/aprovacoes");
    expect(resolvePostAuthPath(false, "//evil.com")).toBe("/dashboard");
  });

  it("redireciona awaiting_password para set-password", () => {
    const result = resolveAccessBlockedRedirect("awaiting_password");
    expect(result.to).toBe("/auth");
    expect(result.search?.view).toBe("set-password");
    expect(result.signOut).toBeUndefined();
  });

  it("invite_pending com sessão e senha definida conduz ao onboarding", () => {
    const session = {
      access_token: "t",
      user: {
        id: "u1",
        invited_at: "2025-01-02T00:00:00Z",
        user_metadata: { lots_bi: { password_set_at: "2025-01-03T00:00:00Z" } },
      },
    } as import("@supabase/supabase-js").Session;

    const blocked = resolveAccessBlockedRedirect("invite_pending", {
      hasSession: true,
      session,
    });
    expect(blocked.search?.view).toBe("onboarding");
    expect(blocked.signOut).toBeUndefined();
  });

  it("invite_pending com sessão sem senha conduz a set-password", () => {
    const session = {
      access_token: "t",
      user: {
        id: "u1",
        invited_at: "2025-01-02T00:00:00Z",
        user_metadata: {},
      },
    } as import("@supabase/supabase-js").Session;

    const blocked = resolveAccessBlockedRedirect("invite_pending", {
      hasSession: true,
      session,
    });
    expect(blocked.search?.view).toBe("set-password");
    expect(blocked.signOut).toBeUndefined();
  });

  it("revoga sessão em status bloqueados", () => {
    expect(resolveAccessBlockedRedirect("revoked").signOut).toBe(true);
    expect(resolveAccessBlockedRedirect("disabled").signOut).toBe(true);
  });

  it("awaiting_password com senha definida vai para onboarding", () => {
    const session = {
      access_token: "t",
      user: {
        id: "u1",
        user_metadata: { lots_bi: { password_set_at: "2025-01-03T00:00:00Z" } },
      },
    } as import("@supabase/supabase-js").Session;

    const blocked = resolveAccessBlockedRedirect("awaiting_password", {
      hasSession: true,
      session,
    });
    expect(blocked.search?.view).toBe("onboarding");
  });
});
