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

  it("invite_pending com sessão conduz a set-password", () => {
    const blocked = resolveAccessBlockedRedirect("invite_pending", true);
    expect(blocked.search?.view).toBe("set-password");
    expect(blocked.signOut).toBeUndefined();
  });

  it("invite_pending sem sessão exige novo convite", () => {
    const blocked = resolveAccessBlockedRedirect("invite_pending", false);
    expect(blocked.search?.view).toBe("link-error");
    expect(blocked.signOut).toBe(true);
  });

  it("revoga sessão em status bloqueados", () => {
    expect(resolveAccessBlockedRedirect("revoked").signOut).toBe(true);
    expect(resolveAccessBlockedRedirect("disabled").signOut).toBe(true);
  });
});
