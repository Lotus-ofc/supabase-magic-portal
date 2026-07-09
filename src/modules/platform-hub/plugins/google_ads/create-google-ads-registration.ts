import type { CredentialVaultPortV1 } from "../../../../../contracts/credential/credential-vault.v1";
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { createRegistrationCredentialAccess } from "../_internal/oauth/create-registration-credential-access";
import { FetchHttpClient } from "../_internal/http/fetch-http-client";
import { createMakePassiveProvider } from "../_internal/provider-framework/create-make-passive-provider";
import { createOfficialApiStubProvider } from "../_internal/provider-framework/create-official-api-stub-provider";
import { GOOGLE_ADS_CAPABILITIES } from "./google_ads.capabilities";
import { GOOGLE_ADS_MANIFEST } from "./google_ads.manifest";
import { createOfficialGoogleAdsProvider } from "./providers/official-google-ads.provider";
import type { PluginAdapterPort } from "@/modules/platform-hub/ports";
import type { ProviderPortV1 } from "../../../../../contracts/provider/provider.v1";
import type { ProviderType } from "../../../../../contracts/ingest/ingest-envelope.v1";
import type { Capability } from "../../../../../contracts/plugin/capability.v1";
import type { HttpClientPort } from "../_internal/http/http-client.port";

export interface CreateGoogleAdsAdapterOptions {
  credentialVault?: CredentialVaultPortV1;
  httpClient?: HttpClientPort;
  developerToken?: string;
}

export function createGoogleAdsAdapter(
  options: CreateGoogleAdsAdapterOptions = {},
): PluginAdapterPort {
  const makePassive = createMakePassiveProvider({
    pluginKey: GOOGLE_ADS_MANIFEST.key,
    platformLabel: GOOGLE_ADS_MANIFEST.label,
  });

  const officialApi: ProviderPortV1 = options.credentialVault
    ? createOfficialGoogleAdsProvider({
        credentialAccess: createRegistrationCredentialAccess(
          options.credentialVault,
          GOOGLE_ADS_MANIFEST.key,
          options.httpClient,
        ),
        httpClient: options.httpClient ?? new FetchHttpClient(),
        developerToken: options.developerToken,
      })
    : createOfficialApiStubProvider({ pluginKey: GOOGLE_ADS_MANIFEST.key });

  const providers = new Map<ProviderType, ProviderPortV1>([
    ["make_passive", makePassive],
    ["official_api", officialApi],
  ]);

  return {
    manifest: GOOGLE_ADS_MANIFEST,
    supports(capability: Capability) {
      return (GOOGLE_ADS_CAPABILITIES as readonly string[]).includes(capability);
    },
    getProvider(providerType: string): ProviderPortV1 {
      const provider = providers.get(providerType as ProviderType);
      if (!provider) {
        throw new Error(`Provider not supported for google_ads: ${providerType}`);
      }
      return provider;
    },
  };
}

export function createGoogleAdsRegistration(
  credentialVault: CredentialVaultPortV1,
  options?: Omit<CreateGoogleAdsAdapterOptions, "credentialVault">,
): PluginRegistration {
  return {
    manifest: GOOGLE_ADS_MANIFEST,
    adapter: createGoogleAdsAdapter({ credentialVault, ...options }),
  };
}
