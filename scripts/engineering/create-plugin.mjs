#!/usr/bin/env node
/**
 * create:plugin — estrutura mínima (não gera código pronto).
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getPluginsRoot } from "../architecture-validation/lib/plugin-paths.mjs";
import { ensureDir } from "../architecture-validation/lib/fs-utils.mjs";

const cwd = process.cwd();
const argKey = process.argv[2];
const rl = readline.createInterface({ input, output });

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function toPascalCase(str) {
  return str
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

const key = slugify(argKey ?? (await rl.question("Plugin key (ex: pinterest): ")));
rl.close();

if (!key || !/^[a-z][a-z0-9_]*$/.test(key)) {
  console.error("❌ key inválida — use snake_case (ex: meta_ads)");
  process.exit(1);
}

const pluginDir = path.join(getPluginsRoot(cwd), key);
if (fs.existsSync(pluginDir)) {
  console.error(`❌ Plugin já existe: ${pluginDir}`);
  process.exit(1);
}

ensureDir(pluginDir);
ensureDir(path.join(pluginDir, "providers"));
ensureDir(path.join(pluginDir, "__tests__"));

const upper = key.toUpperCase();
const pascal = toPascalCase(key);

const manifest = {
  version: "1.0.0",
  key,
  kind: "platform",
  label: key.replace(/_/g, " "),
  category: "ads",
  capabilities: [`${key}:metrics:collect`],
  metrics: [{ key: "impressions", format: "int", official: true }],
  providers: { default: "make_passive", supported: ["make_passive"] },
  publisher: { supported: false },
  identity: { types: ["ad_account"], primary: "ad_account" },
  health: { evaluators: ["generic-freshness"] },
  versions: [{ provider: "make_passive", apiVersion: "v1" }],
  ingestProfiles: ["metrics-timeseries"],
};

fs.writeFileSync(
  path.join(pluginDir, `${key}.manifest.json`),
  JSON.stringify(manifest, null, 2) + "\n",
);

fs.writeFileSync(
  path.join(pluginDir, `${key}.manifest.ts`),
  `import manifest from "./${key}.manifest.json";
import type { PluginManifestV1 } from "../../../../../contracts/plugin/capability.v1";

export const ${upper}_MANIFEST = manifest as PluginManifestV1;
`,
);

fs.writeFileSync(
  path.join(pluginDir, `${key}.adapter.ts`),
  `/**
 * @manual — implementar lógica do adapter (não sobrescrito por generate:plugin).
 */
import type { Capability } from "../../../../../contracts/plugin/capability.v1";
import { ${upper}_MANIFEST } from "./${key}.manifest";
import { ${upper}_CAPABILITIES } from "./${key}.capabilities";

export class ${pascal}Adapter {
  readonly manifest = ${upper}_MANIFEST;

  supports(capability: Capability): boolean {
    return (${upper}_CAPABILITIES as readonly string[]).includes(capability);
  }
}
`,
);

fs.writeFileSync(
  path.join(pluginDir, `${key}.register.ts`),
  `/**
 * @generated — execute npm run generate:plugin para atualizar.
 */
export function register${pascal}Plugin(): void {
  // stub — Fase 1+ registra no Hub Registry
}
`,
);

fs.writeFileSync(
  path.join(pluginDir, `${key}.capabilities.ts`),
  `/**
 * @generated — derivado do manifest. Não editar manualmente.
 */
export const ${upper}_CAPABILITIES = [] as const;
`,
);

fs.writeFileSync(
  path.join(pluginDir, `${key}.metrics.ts`),
  `/**
 * @generated — derivado do manifest. Não editar manualmente.
 */
export const ${upper}_METRICS = [] as const;
`,
);

fs.writeFileSync(path.join(pluginDir, "providers", ".gitkeep"), "");

fs.writeFileSync(
  path.join(pluginDir, "README.md"),
  `# ${key}

Plugin Platform Hub — estrutura mínima.

1. Edite \`${key}.manifest.json\`
2. Implemente \`${key}.adapter.ts\` e \`providers/\`
3. \`npm run generate:plugin -- ${key}\`
4. \`npm run validate:plugin\`
`,
);

console.log(`✅ Plugin criado: src/modules/platform-hub/plugins/${key}/`);
console.log("Próximo: edite o manifest e rode npm run generate:plugin");
