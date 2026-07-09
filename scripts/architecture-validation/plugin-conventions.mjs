import fs from "node:fs";
import path from "node:path";
import { listPluginDirs, pluginFilePaths } from "./lib/plugin-paths.mjs";
import {
  loadManifest,
  validateManifestObject,
  requiredConformanceSuites,
} from "./lib/parse-manifest.mjs";

const cwd = process.cwd();
const errors = [];

for (const { key, dir } of listPluginDirs(cwd)) {
  const paths = pluginFilePaths(dir, key);

  if (!fs.existsSync(paths.manifestJson)) {
    errors.push(`${key}: plugin sem manifest (${key}.manifest.json)`);
    continue;
  }
  if (!fs.existsSync(paths.adapter)) {
    errors.push(`${key}: adapter ausente (${key}.adapter.ts)`);
  }
  if (!fs.existsSync(paths.register)) {
    errors.push(`${key}: plugin sem register (${key}.register.ts)`);
  }
  if (!fs.existsSync(paths.providersDir)) {
    errors.push(`${key}: pasta providers/ ausente`);
  }

  const loaded = loadManifest(dir, key);
  if (!loaded.ok) {
    errors.push(`${key}: ${loaded.error}`);
    continue;
  }

  for (const e of validateManifestObject(loaded.manifest, key)) {
    errors.push(`${key}: ${e}`);
  }

  const defaultProvider = loaded.manifest.providers?.default;
  if (defaultProvider) {
    const providerFiles = fs.existsSync(paths.providersDir)
      ? fs.readdirSync(paths.providersDir).filter((f) => f.endsWith(".ts"))
      : [];
    const hasDefault = providerFiles.some(
      (f) => f.includes(defaultProvider.replace(/_/g, "")) || f.includes(defaultProvider),
    );
    if (providerFiles.length === 0) {
      errors.push(`${key}: provider ausente (providers/ vazio; default: ${defaultProvider})`);
    }
  }

  for (const suite of requiredConformanceSuites(loaded.manifest)) {
    const testFile = path.join(paths.testsDir, `${key}.conformance.${suite}.test.ts`);
    if (!fs.existsSync(testFile)) {
      errors.push(
        `${key}: conformance suite obrigatória ausente: ${suite} (${path.relative(cwd, testFile)})`,
      );
    }
  }
}

if (errors.length > 0) {
  console.error("❌ Plugin conventions falharam:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("✅ Plugin conventions — OK");
