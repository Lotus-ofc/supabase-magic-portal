import type { CredentialVaultPortV1 } from "../../../../../contracts/credential/credential-vault.v1";
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { createRegistrationCredentialAccess } from "../_internal/oauth/create-registration-credential-access";
import { FetchHttpClient } from "../_internal/http/fetch-http-client";
import { createMakePassiveProvider } from "../_internal/provider-framework/create-make-passive-provider";
import { createOfficialApiStubProvider } from "../_internal/provider-framework/create-official-api-stub-provider";
import { TIKTOK_CAPABILITIES } from "./tiktok.capabilities";
import { TIKTOK_MANIFEST } from "./tiktok.manifest";
import { createOfficialTikTokProvider } from "./providers/official-tiktok.provider";
import type { PluginAdapterPort } from "@/modules/platform-hub/ports";
import type { ProviderPortV1 } from "../../../../../contracts/provider/provider.v1";
import type { ProviderType } from "../../../../../contracts/ingest/ingest-envelope.v1";
import type { Capability } from "../../../../../contracts/plugin/capability.v1";
import type { HttpClientPort } from "../_internal/http/http-client.port";

export interface CreateTikTokAdapterOptions {
  credentialVault?: CredentialVaultPortV1;
  httpClient?: HttpClientPort;
}

export function createTikTokAdapter(options: CreateTikTokAdapterOptions = {}): PluginAdapterPort {
  const makePassive = createMakePassiveProvider({
    pluginKey: TIKTOK_MANIFEST.key,
    platformLabel: TIKTOK_MANIFEST.label,
  });

  const officialApi: ProviderPortV1 = options.credentialVault
    ? createOfficialTikTokProvider({
        credentialAccess: createRegistrationCredentialAccess(
          options.credentialVault,
          TIKTOK_MANIFEST.key,
          options.httpClient,
        ),
        httpClient: options.httpClient ?? new FetchHttpClient(),
      })
    : createOfficialApiStubProvider({ pluginKey: TIKTOK_MANIFEST.key });

  const providers = new Map<ProviderType, ProviderPortV1>([
    ["make_passive", makePassive],
    ["official_api", officialApi],
  ]);

  return {
    manifest: TIKTOK_MANIFEST,
    supports(capability: Capability) {
      return (TIKTOK_CAPABILITIES as readonly string[]).includes(capability);
    },
    getProvider(providerType: string): ProviderPortV1 {
      const provider = providers.get(providerType as ProviderType);
      if (!provider) {
        throw new Error(`Provider not supported for tiktok: ${providerType}`);
      }
      return provider;
    },
  };
}

export function createTikTokRegistration(
  credentialVault: CredentialVaultPortV1,
  options?: Omit<CreateTikTokAdapterOptions, "credentialVault">,
): PluginRegistration {
  return {
    manifest: TIKTOK_MANIFEST,
    adapter: createTikTokAdapter({ credentialVault, ...options }),
  };
}
