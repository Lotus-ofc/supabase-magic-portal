import type { CredentialVaultPortV1 } from "../../../../../contracts/credential/credential-vault.v1";
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { createRegistrationCredentialAccess } from "../_internal/oauth/create-registration-credential-access";
import { FetchHttpClient } from "../_internal/http/fetch-http-client";
import { createMakePassiveProvider } from "../_internal/provider-framework/create-make-passive-provider";
import { createOfficialApiStubProvider } from "../_internal/provider-framework/create-official-api-stub-provider";
import { META_ADS_CAPABILITIES } from "./meta_ads.capabilities";
import { META_ADS_MANIFEST } from "./meta_ads.manifest";
import { createOfficialMetaProvider } from "./providers/official-meta.provider";
import type { PluginAdapterPort } from "@/modules/platform-hub/ports";
import type { ProviderPortV1 } from "../../../../../contracts/provider/provider.v1";
import type { ProviderType } from "../../../../../contracts/ingest/ingest-envelope.v1";
import type { Capability } from "../../../../../contracts/plugin/capability.v1";
import type { HttpClientPort } from "../_internal/http/http-client.port";

export interface CreateMetaAdsAdapterOptions {
  credentialVault?: CredentialVaultPortV1;
  httpClient?: HttpClientPort;
}

export function createMetaAdsAdapter(options: CreateMetaAdsAdapterOptions = {}): PluginAdapterPort {
  const makePassive = createMakePassiveProvider({
    pluginKey: META_ADS_MANIFEST.key,
    platformLabel: META_ADS_MANIFEST.label,
  });

  const officialApi: ProviderPortV1 = options.credentialVault
    ? createOfficialMetaProvider({
        credentialAccess: createRegistrationCredentialAccess(
          options.credentialVault,
          META_ADS_MANIFEST.key,
          options.httpClient,
        ),
        httpClient: options.httpClient ?? new FetchHttpClient(),
      })
    : createOfficialApiStubProvider({ pluginKey: META_ADS_MANIFEST.key });

  const providers = new Map<ProviderType, ProviderPortV1>([
    ["make_passive", makePassive],
    ["official_api", officialApi],
  ]);

  return {
    manifest: META_ADS_MANIFEST,
    supports(capability: Capability) {
      return (META_ADS_CAPABILITIES as readonly string[]).includes(capability);
    },
    getProvider(providerType: string): ProviderPortV1 {
      const provider = providers.get(providerType as ProviderType);
      if (!provider) {
        throw new Error(`Provider not supported for meta_ads: ${providerType}`);
      }
      return provider;
    },
  };
}

export function createMetaAdsRegistration(
  credentialVault: CredentialVaultPortV1,
  options?: Omit<CreateMetaAdsAdapterOptions, "credentialVault">,
): PluginRegistration {
  return {
    manifest: META_ADS_MANIFEST,
    adapter: createMetaAdsAdapter({ credentialVault, ...options }),
  };
}
