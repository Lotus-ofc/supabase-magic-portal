import { platformHubModuleInfos, scanModules } from "../extractors/module-scanner";
import type { ModuleInfo } from "../types";

export function buildModules(): ModuleInfo[] {
  const scanned = scanModules();
  const hub = platformHubModuleInfos();
  const existing = new Set(scanned.map((module) => module.id));
  return [...scanned, ...hub.filter((module) => !existing.has(module.id))];
}
