import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const hubRoot = path.resolve(__dirname, "..");

const SUBMODULES = [
  "registry",
  "plugins",
  "connections",
  "identity",
  "metric-pipeline",
  "runtime",
  "health",
  "bridges",
  "observability",
  "public",
  "ports",
] as const;

const FORBIDDEN_MARKERS = [
  'from "react"',
  "from 'react'",
  "@/integrations/supabase",
  "createServerFn",
  "cadastro_clientes",
];

const NEW_SUBMODULES = [
  "connections",
  "identity",
  "metric-pipeline",
  "runtime",
  "health",
  "bridges",
  "observability",
] as const;

function walkTsFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      files.push(...walkTsFiles(fullPath));
      continue;
    }
    if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("platform-hub module structure (Fase 2)", () => {
  it.each(SUBMODULES)("submódulo %s possui README.md e index.ts", (name) => {
    const dir = path.join(hubRoot, name);
    expect(fs.existsSync(path.join(dir, "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(dir, "index.ts"))).toBe(true);
  });

  it("novos submódulos possuem pasta stubs/", () => {
    for (const name of NEW_SUBMODULES) {
      expect(fs.existsSync(path.join(hubRoot, name, "stubs"))).toBe(true);
    }
  });

  it("platform-hub-bridges/legacy-cadastro existe isolado do Hub", () => {
    const bridgeRoot = path.resolve(hubRoot, "../platform-hub-bridges/legacy-cadastro");
    expect(fs.existsSync(path.join(bridgeRoot, "README.md"))).toBe(true);
    expect(fs.existsSync(path.join(bridgeRoot, "index.ts"))).toBe(true);
  });

  it("Hub não referencia cadastro_clientes diretamente", () => {
    const files = walkTsFiles(hubRoot);
    const offenders = files.filter((file) => {
      const content = fs.readFileSync(file, "utf8");
      return (
        content.includes("cadastro_clientes") && !file.includes(`${path.sep}bridges${path.sep}`)
      );
    });
    expect(offenders).toEqual([]);
  });

  it("stubs Fase 2 não importam dependências proibidas", () => {
    const offenders: string[] = [];
    for (const name of NEW_SUBMODULES) {
      const stubDir = path.join(hubRoot, name, "stubs");
      if (!fs.existsSync(stubDir)) continue;
      for (const file of walkTsFiles(stubDir)) {
        const content = fs.readFileSync(file, "utf8");
        for (const marker of FORBIDDEN_MARKERS) {
          if (content.includes(marker)) {
            offenders.push(`${path.relative(hubRoot, file)}: ${marker}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("platform-hub submodule exports (Fase 2)", () => {
  it("connections compila exports", async () => {
    const mod = await import("../connections");
    expect(mod.connectionResolverStub).toBeDefined();
    expect(typeof mod.connectionResolverStub.resolveScopeRef).toBe("function");
  });

  it("identity compila exports", async () => {
    const mod = await import("../identity");
    expect(mod.identityResolverStub).toBeDefined();
  });

  it("metric-pipeline compila exports", async () => {
    const mod = await import("../metric-pipeline");
    expect(mod.metricPipelineStub).toBeDefined();
    expect(mod.metricWriterStub).toBeDefined();
  });

  it("runtime compila exports", async () => {
    const mod = await import("../runtime");
    expect(mod.syncRuntimeStub).toBeDefined();
  });

  it("health compila exports", async () => {
    const mod = await import("../health");
    expect(mod.healthReconciliationStub).toBeDefined();
  });

  it("bridges compila exports", async () => {
    const mod = await import("../bridges");
    expect(mod.legacyCadastroBridgeStub).toBeDefined();
  });

  it("observability compila exports", async () => {
    const mod = await import("../observability");
    expect(mod.hubObservabilityStub).toBeDefined();
  });

  it("registry compila exports", async () => {
    const mod = await import("../registry");
    expect(mod.HubRegistry).toBeDefined();
    expect(mod.GlobPluginLoader).toBeDefined();
  });
});
