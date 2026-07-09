import fs from "node:fs";

const CAPABILITY_PATTERN = /^[a-z0-9_]+:[a-z0-9_]+:[a-z0-9_]+$/;

/**
 * Manifest canônico: `{key}.manifest.json` (objetivo para validators/generators).
 */
export function loadManifest(pluginDir, key) {
  const jsonPath = `${pluginDir}/${key}.manifest.json`;
  if (!fs.existsSync(jsonPath))
    return { ok: false, error: `manifest ausente: ${key}.manifest.json` };
  try {
    const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    return { ok: true, manifest: raw, path: jsonPath };
  } catch (e) {
    return { ok: false, error: `manifest JSON inválido (${key}): ${e.message}` };
  }
}

export function validateManifestObject(manifest, folderKey) {
  const errors = [];

  if (manifest.version !== "1.0.0") {
    errors.push(`version deve ser "1.0.0" (recebido: ${manifest.version ?? "undefined"})`);
  }
  if (!manifest.key || typeof manifest.key !== "string") {
    errors.push("campo key obrigatório");
  } else if (manifest.key !== folderKey) {
    errors.push(`key "${manifest.key}" deve coincidir com pasta "${folderKey}"`);
  }
  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
    errors.push("capabilities deve ser array não vazio");
  } else {
    for (const cap of manifest.capabilities) {
      if (!CAPABILITY_PATTERN.test(cap)) {
        errors.push(`capability não namespaced: "${cap}"`);
      }
    }
  }
  if (!manifest.providers?.default) {
    errors.push("providers.default obrigatório");
  }
  if (!Array.isArray(manifest.providers?.supported) || manifest.providers.supported.length === 0) {
    errors.push("providers.supported deve ser array não vazio");
  } else if (
    manifest.providers.default &&
    !manifest.providers.supported.includes(manifest.providers.default)
  ) {
    errors.push(
      `providers.default "${manifest.providers.default}" deve estar em providers.supported`,
    );
  }
  if (!Array.isArray(manifest.versions)) {
    errors.push("versions deve ser array");
  } else {
    for (const v of manifest.versions) {
      if (!v.provider || !v.apiVersion) {
        errors.push("versions[] exige provider e apiVersion");
      }
      if (v.supportedUntil && Number.isNaN(Date.parse(v.supportedUntil))) {
        errors.push(`versions[].supportedUntil inválido: ${v.supportedUntil}`);
      }
    }
  }

  return errors;
}

export function requiredConformanceSuites(manifest) {
  const suites = [];
  const profiles = manifest.ingestProfiles ?? [];
  if (profiles.includes("metrics-timeseries")) suites.push("metrics-timeseries");
  if (manifest.publisher?.supported === true) suites.push("publish");
  if ((manifest.capabilities ?? []).some((c) => c.includes(":webhook:"))) suites.push("webhook");
  return suites;
}

export function collectCapabilitiesFromPlugins(cwd, listPluginDirs, loadManifestFn) {
  const seen = new Map();
  const duplicates = [];
  for (const { key, dir } of listPluginDirs(cwd)) {
    const loaded = loadManifestFn(dir, key);
    if (!loaded.ok) continue;
    for (const cap of loaded.manifest.capabilities ?? []) {
      if (!seen.has(cap)) {
        seen.set(cap, [key]);
      } else {
        const plugins = seen.get(cap);
        if (!plugins.includes(key)) plugins.push(key);
        if (plugins.length === 2) {
          duplicates.push({ capability: cap, plugins: [...plugins] });
        }
      }
    }
  }
  return duplicates;
}
