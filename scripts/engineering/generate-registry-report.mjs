#!/usr/bin/env node
/**
 * Gera registry-report.json a partir dos manifests dos plugins (sem runtime introspection).
 */
import fs from "node:fs";
import path from "node:path";
import { listPluginDirs } from "../architecture-validation/lib/plugin-paths.mjs";
import {
  loadManifest,
  validateManifestObject,
} from "../architecture-validation/lib/parse-manifest.mjs";

const cwd = process.cwd();
const outPath = path.join(cwd, "scripts/generated/registry-report.json");

const plugins = [];
const capabilitiesSet = new Set();
const providersSet = new Set();
const metricDefinitions = [];
const apiVersions = [];
const healthEvaluators = [];
const publishers = [];
const oauthTypes = new Set();
const errors = [];

for (const { key, dir } of listPluginDirs(cwd)) {
  const loaded = loadManifest(dir, key);
  if (!loaded.ok) {
    errors.push(`${key}: ${loaded.error}`);
    continue;
  }
  const m = loaded.manifest;
  for (const e of validateManifestObject(m, key)) errors.push(`${key}: ${e}`);

  plugins.push({
    key: m.key,
    capabilities: m.capabilities,
    providers: m.providers.supported,
    ingestProfiles: m.ingestProfiles ?? [],
  });
  for (const c of m.capabilities) capabilitiesSet.add(c);
  for (const p of m.providers.supported) providersSet.add(p);
  for (const metric of m.metrics ?? []) {
    metricDefinitions.push({ plugin: m.key, key: metric.key, format: metric.format });
  }
  for (const v of m.versions ?? []) {
    apiVersions.push({ plugin: m.key, version: v.apiVersion, expiresIn: v.supportedUntil });
  }
  for (const ev of m.health?.evaluators ?? []) {
    healthEvaluators.push({ plugin: m.key, key: ev });
  }
  publishers.push({ plugin: m.key, supported: m.publisher?.supported ?? false });
  if (m.oauth?.type) oauthTypes.add(m.oauth.type);
}

const report = {
  contractVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  plugins,
  capabilities: [...capabilitiesSet].sort(),
  providers: [...providersSet].sort(),
  metricDefinitions,
  apiVersions,
  healthEvaluators,
  publishers,
  oauthTypes: [...oauthTypes].sort(),
  writers: ["base_metricas"],
  orphans: { plugins: [], capabilities: [], metrics: [] },
  validationErrors: errors,
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
console.log("✅ registry-report.json gerado:", path.relative(cwd, outPath));

if (errors.length > 0) {
  console.error("⚠ Manifests com problemas:", errors.length);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
