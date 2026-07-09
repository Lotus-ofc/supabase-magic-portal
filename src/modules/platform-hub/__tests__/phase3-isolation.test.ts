import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const hubRoot = path.resolve(__dirname, "..");
const bridgesRoot = path.resolve(hubRoot, "../platform-hub-bridges");

const PROVIDER_FORBIDDEN = [
  "cadastro_clientes",
  "@/integrations/supabase",
  "createServerFn",
  'from "react"',
  "dashboard",
  "agency-os",
  "approval",
];

function walkProviderFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      files.push(...walkProviderFiles(fullPath));
      continue;
    }
    if (entry.name.endsWith(".ts") && fullPath.includes(`${path.sep}providers${path.sep}`)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe("Fase 3 — isolamento do legado", () => {
  it("platform-hub não importa cadastro_clientes fora de bridges/", () => {
    const offenders: string[] = [];

    function walk(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "__tests__") continue;
          walk(fullPath);
          continue;
        }
        if (!entry.name.endsWith(".ts")) continue;
        if (fullPath.includes(`${path.sep}bridges${path.sep}`)) continue;
        const content = fs.readFileSync(fullPath, "utf8");
        if (content.includes("cadastro_clientes")) {
          offenders.push(path.relative(hubRoot, fullPath));
        }
      }
    }

    walk(hubRoot);
    expect(offenders).toEqual([]);
  });

  it("cadastro_clientes só aparece em platform-hub-bridges (código de produção)", () => {
    const hubOffenders: string[] = [];
    const bridgeHits: string[] = [];

    function scan(dir: string, bucket: string[]) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules" || entry.name === "__tests__") continue;
          scan(fullPath, bucket);
          continue;
        }
        if (!entry.name.endsWith(".ts") || entry.name.endsWith(".test.ts")) continue;
        if (fs.readFileSync(fullPath, "utf8").includes("cadastro_clientes")) {
          bucket.push(fullPath);
        }
      }
    }

    scan(hubRoot, hubOffenders);
    scan(bridgesRoot, bridgeHits);

    expect(hubOffenders).toEqual([]);
    expect(bridgeHits.length).toBeGreaterThan(0);
  });

  it("providers não conhecem cliente, Supabase ou dashboard", () => {
    const providerFiles = walkProviderFiles(path.join(hubRoot, "plugins"));
    const offenders: string[] = [];

    for (const file of providerFiles) {
      const content = fs.readFileSync(file, "utf8").toLowerCase();
      for (const marker of PROVIDER_FORBIDDEN) {
        if (content.includes(marker.toLowerCase())) {
          offenders.push(`${path.relative(hubRoot, file)}: ${marker}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
