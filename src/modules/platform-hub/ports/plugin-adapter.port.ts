/**
 * PluginAdapterPort — lógica do plugin; roteia para providers.
 *
 * @implements plugins/{key}/{key}.adapter.ts
 * @consumes HubRegistryPort (registro e lookup)
 * @first-use Fase -1 (example); registry Fase 1
 */
import type { Capability, PluginManifest } from "./types";
import type { ProviderPort } from "./provider.port";

export interface PluginAdapterPort {
  readonly manifest: PluginManifest;
  supports(capability: Capability): boolean;
  getProvider(providerType: string): ProviderPort;
}
