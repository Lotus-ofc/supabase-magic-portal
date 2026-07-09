import type {
  Capability,
  HubRegistryPort,
  MetricDefinitionV1,
  PluginKey,
  PluginManifest,
  PluginRegistration,
} from "@/modules/platform-hub/ports";

/**
 * Catálogo tipado de plugins — sem execução, sem IO, sem efeitos colaterais.
 */
export class HubRegistry implements HubRegistryPort {
  private readonly plugins = new Map<PluginKey, PluginRegistration>();

  register(...registrations: readonly PluginRegistration[]): void {
    for (const registration of registrations) {
      const key = registration.manifest.key;
      if (!key) {
        throw new Error("Invalid plugin: manifest.key is required");
      }
      if (registration.adapter.manifest.key !== key) {
        throw new Error(`Invalid plugin: adapter.manifest.key mismatch (${key})`);
      }
      if (this.plugins.has(key)) {
        throw new Error(`Duplicate plugin registration: ${key}`);
      }
      this.plugins.set(key, registration);
    }
  }

  getPlugin(key: PluginKey): PluginRegistration {
    const plugin = this.plugins.get(key);
    if (!plugin) {
      throw new Error(`Plugin not found: ${key}`);
    }
    return plugin;
  }

  getAllPlugins(): readonly PluginRegistration[] {
    return [...this.plugins.values()].sort((a, b) => a.manifest.key.localeCompare(b.manifest.key));
  }

  findByCapability(capability: Capability): readonly PluginRegistration[] {
    return this.getAllPlugins().filter((plugin) =>
      (plugin.manifest.capabilities as readonly string[]).includes(capability),
    );
  }

  getMetricDefinitions(pluginKey: PluginKey): readonly MetricDefinitionV1[] {
    return this.getPlugin(pluginKey).manifest.metrics;
  }

  getApiVersions(pluginKey: PluginKey): PluginManifest["versions"] {
    return this.getPlugin(pluginKey).manifest.versions;
  }
}
