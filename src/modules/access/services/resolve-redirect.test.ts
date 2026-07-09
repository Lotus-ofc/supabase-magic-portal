import { describe, expect, it } from "vitest";
import { resolveBlockedRedirect } from "@/modules/access/services/resolve-blocked-redirect";
import { resolvePostAuthDestination } from "@/modules/access/services/resolve-post-auth-destination";

describe("access redirect services", () => {
  it("envia admin para /admin e cliente para /dashboard", () => {
    expect(resolvePostAuthDestination(true)).toBe("/admin");
    expect(resolvePostAuthDestination(false)).toBe("/dashboard");
  });

  it("respeita redirect interno seguro", () => {
    expect(resolvePostAuthDestination(false, "/aprovacoes")).toBe("/aprovacoes");
    expect(resolvePostAuthDestination(false, "//evil.com")).toBe("/dashboard");
  });

  it("awaiting_password sem sessão conduz ao login", () => {
    const result = resolveBlockedRedirect("awaiting_password");
    expect(result.to).toBe("/auth");
    expect(result.search?.view).toBe("login");
    expect(result.signOut).toBeUndefined();
  });

  it("invite_pending com sessão conduz a set-password", () => {
    const blocked = resolveBlockedRedirect("invite_pending", true);
    expect(blocked.search?.view).toBe("set-password");
    expect(blocked.signOut).toBeUndefined();
  });

  it("invite_pending sem sessão exige novo convite", () => {
    const blocked = resolveBlockedRedirect("invite_pending", false);
    expect(blocked.search?.view).toBe("link-error");
    expect(blocked.signOut).toBe(true);
  });

  it("invite_expired legado normaliza como invite_pending sem sessão", () => {
    const blocked = resolveBlockedRedirect("invite_expired", false);
    expect(blocked.search?.view).toBe("link-error");
    expect(blocked.signOut).toBe(true);
  });

  it("revoga sessão em status bloqueados", () => {
    expect(resolveBlockedRedirect("revoked").signOut).toBe(true);
    expect(resolveBlockedRedirect("disabled").signOut).toBe(true);
  });
});
