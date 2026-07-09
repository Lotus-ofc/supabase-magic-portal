import type { Capability, PluginManifest } from "@/modules/platform-hub/ports";
import type { PluginAdapterPort } from "@/modules/platform-hub/ports";

/** Adapter mínimo para plugins marketing na Fase 1 — sem provider real. */
export function createStubAdapter(
  manifest: PluginManifest,
  capabilities: readonly Capability[],
): PluginAdapterPort {
  return {
    manifest,
    supports(capability: Capability) {
      return (capabilities as readonly string[]).includes(capability);
    },
    getProvider() {
      throw new Error(`Provider not available in Fase 1: ${manifest.key}`);
    },
  };
}
