/**
 * HubRegistryPort — container de plugins e capabilities.
 *
 * @implements HubRegistry class (Fase 1)
 * @consumes bootstrap (F1), Sync Runtime (F6), Publisher (F13)
 * @first-use Fase 1
 */
import type { Capability, PluginKey, PluginManifest, MetricDefinitionV1 } from "./types";
import type { PluginAdapterPort } from "./plugin-adapter.port";

export interface PluginRegistration {
  manifest: PluginManifest;
  adapter: PluginAdapterPort;
}

export interface HubRegistryPort {
  register(...registrations: readonly PluginRegistration[]): void;
  getPlugin(key: PluginKey): PluginRegistration;
  getAllPlugins(): readonly PluginRegistration[];
  findByCapability(capability: Capability): readonly PluginRegistration[];
  getMetricDefinitions(pluginKey: PluginKey): readonly MetricDefinitionV1[];
  getApiVersions(pluginKey: PluginKey): PluginManifest["versions"];
}
