import { describe, expect, it } from "vitest";
import { buildAuthDiagnostics, buildProductionChecklist } from "./auth-diagnostics";

describe("auth-diagnostics", () => {
  it("permite convites em development com localhost", () => {
    const report = buildAuthDiagnostics({
      appUrlConfigured: "http://localhost:5173",
      currentDomain: "http://localhost:5173",
      nodeEnv: "development",
      supabaseClientReady: true,
      supabaseAuthAvailable: true,
    });
    expect(report.invites_allowed).toBe(true);
    expect(report.environment).toBe("development");
  });

  it("bloqueia convites em production com APP_URL localhost", () => {
    const report = buildAuthDiagnostics({
      appUrlConfigured: "http://localhost:5173",
      currentDomain: "https://lotsbi.leandromajr.com",
      nodeEnv: "production",
      supabaseClientReady: true,
      supabaseAuthAvailable: true,
    });
    expect(report.invites_allowed).toBe(false);
    expect(report.block_invites_reason).toMatch(/localhost/i);
    expect(report.message).toMatch(/Corrija a configuração/);
  });

  it("bloqueia convites quando APP_URL difere do domínio esperado em production", () => {
    const report = buildAuthDiagnostics({
      appUrlConfigured: "https://wrong.example.com",
      currentDomain: "https://lotsbi.leandromajr.com",
      nodeEnv: "production",
      supabaseClientReady: true,
      supabaseAuthAvailable: true,
    });
    expect(report.invites_allowed).toBe(false);
    expect(report.block_invites_reason).toMatch(/não corresponde/i);
  });

  it("permite convites quando APP_URL alinha com production", () => {
    const report = buildAuthDiagnostics({
      appUrlConfigured: "https://lotsbi.leandromajr.com",
      currentDomain: "https://lotsbi.leandromajr.com",
      nodeEnv: "production",
      supabaseClientReady: true,
      supabaseAuthAvailable: true,
    });
    expect(report.invites_allowed).toBe(true);
    expect(report.production_ready).toBe(true);
    expect(report.status).toBe("ok");
  });

  it("monta checklist de produção", () => {
    const auth = buildAuthDiagnostics({
      appUrlConfigured: "https://lotsbi.leandromajr.com",
      currentDomain: "https://lotsbi.leandromajr.com",
      nodeEnv: "production",
      supabaseClientReady: true,
      supabaseAuthAvailable: true,
    });
    const checklist = buildProductionChecklist(auth, {
      database_ok: true,
      storage_ok: true,
      integrations_ok: true,
    });
    expect(checklist.find((c) => c.id === "invites")?.status).toBe("ok");
    expect(checklist.every((c) => c.status !== "error")).toBe(true);
  });
});
