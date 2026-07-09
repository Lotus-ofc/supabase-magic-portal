#!/usr/bin/env node
/**
 * generate:plugin — gera apenas artefatos 100% derivados do manifest.
 * Nunca sobrescreve: adapter, providers/, lógica manual.
 */
import fs from "node:fs";
import path from "node:path";
import { listPluginDirs } from "../architecture-validation/lib/plugin-paths.mjs";
import {
  loadManifest,
  requiredConformanceSuites,
} from "../architecture-validation/lib/parse-manifest.mjs";
import { ensureDir } from "../architecture-validation/lib/fs-utils.mjs";

const cwd = process.cwd();
const targetKey = process.argv[2];

function toPascalCase(str) {
  return str
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

function generateRegister(key, manifest) {
  const pascal = toPascalCase(key);
  const upper = key.toUpperCase();
  const adapterExpr = key === "example" ? `new ${pascal}Adapter()` : `${pascal}Adapter`;
  return `/**
 * @generated — derivado de ${key}.manifest.json. Não editar manualmente.
 */
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { ${upper}_MANIFEST } from "./${key}.manifest";
import { ${pascal}Adapter } from "./${key}.adapter";

export function getPluginRegistration(): PluginRegistration {
  return { manifest: ${upper}_MANIFEST, adapter: ${adapterExpr} };
}
`;
}

function generateCapabilities(key, manifest) {
  const caps = JSON.stringify(manifest.capabilities ?? [], null, 2);
  return `/**
 * @generated — derivado de ${key}.manifest.json. Não editar manualmente.
 */
export const ${key.toUpperCase()}_CAPABILITIES = ${caps} as const;
`;
}

function generateMetrics(key, manifest) {
  const metrics = JSON.stringify(manifest.metrics ?? [], null, 2);
  return `/**
 * @generated — derivado de ${key}.manifest.json. Não editar manualmente.
 */
export const ${key.toUpperCase()}_METRICS = ${metrics} as const;
`;
}

function generateConformanceTest(key, suite, manifest) {
  if (suite === "metrics-timeseries" && key === "example") {
    return null;
  }

  const pascal = toPascalCase(key);
  const upper = key.toUpperCase();
  const metricsCapability =
    (manifest.capabilities ?? []).find((cap) => cap.endsWith(":metrics:collect")) ??
    `${key}:metrics:collect`;

  if (suite === "metrics-timeseries") {
    return `import { describe, expect, it } from "vitest";
import { ${pascal}Adapter } from "../${key}.adapter";
import { ${upper}_MANIFEST } from "../${key}.manifest";

describe("${key} conformance: metrics-timeseries", () => {
  it("manifest declara perfil metrics-timeseries", () => {
    expect(${upper}_MANIFEST.ingestProfiles).toContain("metrics-timeseries");
  });

  it("adapter supports metrics capability", () => {
    expect(${pascal}Adapter.supports("${metricsCapability}")).toBe(true);
  });
});
`;
  }

  return `import { describe, it } from "vitest";

describe("${key} conformance: ${suite}", () => {
  it.todo("suite ${suite} — implementar quando manifest exigir");
});
`;
}

const plugins = listPluginDirs(cwd).filter((p) => !targetKey || p.key === targetKey);

if (targetKey && plugins.length === 0) {
  console.error(`❌ Plugin não encontrado: ${targetKey}`);
  process.exit(1);
}

for (const { key, dir } of plugins) {
  const loaded = loadManifest(dir, key);
  if (!loaded.ok) {
    console.error(`❌ ${loaded.error}`);
    process.exit(1);
  }
  const manifest = loaded.manifest;

  fs.writeFileSync(path.join(dir, `${key}.register.ts`), generateRegister(key, manifest));
  fs.writeFileSync(path.join(dir, `${key}.capabilities.ts`), generateCapabilities(key, manifest));
  fs.writeFileSync(path.join(dir, `${key}.metrics.ts`), generateMetrics(key, manifest));

  const testsDir = path.join(dir, "__tests__");
  ensureDir(testsDir);
  for (const suite of requiredConformanceSuites(manifest)) {
    const testPath = path.join(testsDir, `${key}.conformance.${suite}.test.ts`);
    const content = generateConformanceTest(key, suite, manifest);
    if (content) {
      fs.writeFileSync(testPath, content);
    }
  }

  console.log(`✅ generate:plugin — ${key}`);
}
