/**
 * PluginLoaderPort — descobre e carrega plugins do filesystem.
 *
 * @implements GlobPluginLoader (Fase 1)
 * @consumes bootstrap.ts (Fase 1)
 * @first-use Fase 1
 */
import type { PluginRegistration } from "./hub-registry.port";

/**
 * PluginLoaderPort — descobre plugins registrados.
 *
 * @implements GlobPluginLoader (Fase 1)
 * @consumes createHubRegistry (F1)
 * @first-use Fase 1
 */
export interface PluginLoaderPort {
  load(): readonly PluginRegistration[];
}
