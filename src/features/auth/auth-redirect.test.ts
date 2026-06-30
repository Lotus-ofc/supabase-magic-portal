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

  it("revoga sessão em status bloqueados", () => {
    expect(resolveAccessBlockedRedirect("revoked").signOut).toBe(true);
    expect(resolveAccessBlockedRedirect("disabled").signOut).toBe(true);
  });
});
