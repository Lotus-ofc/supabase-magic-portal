import { scanModules } from "../extractors/module-scanner";
import type { ModuleInfo } from "../types";

export function buildModules(): ModuleInfo[] {
  return scanModules();
}
