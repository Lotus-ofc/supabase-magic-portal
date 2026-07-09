import type { Capability } from "../../../../../contracts/plugin/capability.v1";
import type { ProviderPortV1 } from "../../../../../contracts/provider/provider.v1";
import type { ProviderType } from "../../../../../contracts/ingest/ingest-envelope.v1";
import type { PluginAdapterPort, PluginManifest } from "@/modules/platform-hub/ports";
import { createMakePassiveProvider } from "./create-make-passive-provider";
import { createOfficialApiStubProvider } from "./create-official-api-stub-provider";

export interface MarketingAdapterConfig {
  manifest: PluginManifest;
  capabilities: readonly Capability[];
  platformLabel: string;
}

/**
 * Adapter padrão para plugins marketing — make_passive + official_api stub.
 * Provider selection via manifest.providers.supported.
 */
export function createMarketingAdapter(config: MarketingAdapterConfig): PluginAdapterPort {
  const makePassive = createMakePassiveProvider({
    pluginKey: config.manifest.key,
    platformLabel: config.platformLabel,
  });
  const officialStub = createOfficialApiStubProvider({ pluginKey: config.manifest.key });

  const providers = new Map<ProviderType, ProviderPortV1>([
    ["make_passive", makePassive],
    ["official_api", officialStub],
  ]);

  return {
    manifest: config.manifest,
    supports(capability: Capability) {
      return (config.capabilities as readonly string[]).includes(capability);
    },
    getProvider(providerType: string): ProviderPortV1 {
      const provider = providers.get(providerType as ProviderType);
      if (!provider) {
        throw new Error(`Provider not supported for ${config.manifest.key}: ${providerType}`);
      }
      return provider;
    },
  };
}
