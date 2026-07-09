import type { PluginKey } from "../../../../../contracts/plugin/capability.v1";
import type { ProviderPortV1 } from "../../../../../contracts/provider/provider.v1";

export interface OfficialApiStubProviderConfig {
  pluginKey: PluginKey;
}

/** Stub official_api — reservado para implementação OAuth/API (Fase 7+). */
export function createOfficialApiStubProvider(
  config: OfficialApiStubProviderConfig,
): ProviderPortV1 {
  return {
    providerType: "official_api",
    async collect() {
      throw new Error(`Official API provider not implemented: ${config.pluginKey}`);
    },
  };
}
