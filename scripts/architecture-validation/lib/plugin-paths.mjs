import fs from "node:fs";
import path from "node:path";

const PLUGINS_ROOT = "src/modules/platform-hub/plugins";

export function getPluginsRoot(cwd) {
  return path.join(cwd, PLUGINS_ROOT);
}

export function listPluginDirs(cwd) {
  const root = getPluginsRoot(cwd);
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith("_"))
    .map((e) => ({
      key: e.name,
      dir: path.join(root, e.name),
    }));
}

export function pluginFilePaths(pluginDir, key) {
  return {
    manifestJson: path.join(pluginDir, `${key}.manifest.json`),
    manifestTs: path.join(pluginDir, `${key}.manifest.ts`),
    adapter: path.join(pluginDir, `${key}.adapter.ts`),
    register: path.join(pluginDir, `${key}.register.ts`),
    capabilities: path.join(pluginDir, `${key}.capabilities.ts`),
    metrics: path.join(pluginDir, `${key}.metrics.ts`),
    providersDir: path.join(pluginDir, "providers"),
    readme: path.join(pluginDir, "README.md"),
    testsDir: path.join(pluginDir, "__tests__"),
  };
}
