import type { PluginLoaderPort } from "@/modules/platform-hub/ports";
import { GlobPluginLoader } from "./glob-plugin-loader";
import { HubRegistry } from "./hub-registry";

/** Factory — sem singleton. Cada chamada produz registry novo e determinístico. */
export function createHubRegistry(loader: PluginLoaderPort = new GlobPluginLoader()): HubRegistry {
  const registry = new HubRegistry();
  registry.register(...loader.load());
  return registry;
}
