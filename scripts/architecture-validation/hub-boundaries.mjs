import fs from "node:fs";
import path from "node:path";
import { walk, rel } from "./lib/fs-utils.mjs";
import { getPluginsRoot } from "./lib/plugin-paths.mjs";

const cwd = process.cwd();
const errors = [];

const hubRoot = path.join(cwd, "src/modules/platform-hub");
const srcRoot = path.join(cwd, "src");

/** SDKs de plataformas externas (Meta, Google, etc.) — não inclui Supabase (infra interna). */
const EXTERNAL_PLATFORM_SDK_MARKERS = [
  "facebook-nodejs-business-sdk",
  "google-ads-api",
  "googleapis",
  "tiktok-business-api-sdk",
];

function isAllowedSdkPath(filePath) {
  const r = rel(cwd, filePath);
  return (
    r.startsWith("src/modules/platform-hub/") || r.startsWith("src/modules/platform-hub-bridges/")
  );
}

for (const file of walk(srcRoot)) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const r = rel(cwd, file);
  const content = fs.readFileSync(file, "utf8");
  for (const marker of EXTERNAL_PLATFORM_SDK_MARKERS) {
    const importPattern = new RegExp(
      `(?:from|import)\\s+["']${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/[^"']*)?["']`,
    );
    if (importPattern.test(content) && !isAllowedSdkPath(file)) {
      errors.push(`${r}: SDK externo "${marker}" fora de platform-hub/`);
    }
  }
}

const pluginsRoot = getPluginsRoot(cwd);
if (fs.existsSync(pluginsRoot)) {
  for (const file of walk(pluginsRoot)) {
    if (!file.endsWith(".ts")) continue;
    const r = rel(cwd, file);
    const parts = r.split("/");
    const pluginKey = parts[4];
    const content = fs.readFileSync(file, "utf8");
    for (const other of fs.readdirSync(pluginsRoot)) {
      if (other === pluginKey || other.startsWith("_")) continue;
      if (content.includes(`/plugins/${other}/`) || content.includes(`plugins/${other}.`)) {
        errors.push(`${r}: plugin importa outro plugin (${other})`);
      }
    }
  }
}

const forbiddenInHub = [
  'from "react"',
  "from 'react'",
  "@/integrations/supabase",
  "createServerFn",
];
for (const file of walk(hubRoot)) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const r = rel(cwd, file);
  const content = fs.readFileSync(file, "utf8");
  for (const marker of forbiddenInHub) {
    if (content.includes(marker)) {
      errors.push(`${r}: import proibido em platform-hub (Fase -1): ${marker}`);
    }
  }
}

if (errors.length > 0) {
  console.error("❌ Hub boundaries falharam:\n");
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log("✅ Hub boundaries — OK");
