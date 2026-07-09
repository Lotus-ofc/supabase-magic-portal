import type { CredentialVaultPortV1 } from "../../../../../contracts/credential/credential-vault.v1";
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { createRegistrationCredentialAccess } from "../_internal/oauth/create-registration-credential-access";
import { FetchHttpClient } from "../_internal/http/fetch-http-client";
import { createMakePassiveProvider } from "../_internal/provider-framework/create-make-passive-provider";
import { createOfficialApiStubProvider } from "../_internal/provider-framework/create-official-api-stub-provider";
import { YOUTUBE_CAPABILITIES } from "./youtube.capabilities";
import { YOUTUBE_MANIFEST } from "./youtube.manifest";
import { createOfficialYouTubeProvider } from "./providers/official-youtube.provider";
import type { PluginAdapterPort } from "@/modules/platform-hub/ports";
import type { ProviderPortV1 } from "../../../../../contracts/provider/provider.v1";
import type { ProviderType } from "../../../../../contracts/ingest/ingest-envelope.v1";
import type { Capability } from "../../../../../contracts/plugin/capability.v1";
import type { HttpClientPort } from "../_internal/http/http-client.port";

export interface CreateYouTubeAdapterOptions {
  credentialVault?: CredentialVaultPortV1;
  httpClient?: HttpClientPort;
}

export function createYouTubeAdapter(options: CreateYouTubeAdapterOptions = {}): PluginAdapterPort {
  const makePassive = createMakePassiveProvider({
    pluginKey: YOUTUBE_MANIFEST.key,
    platformLabel: YOUTUBE_MANIFEST.label,
  });

  const officialApi: ProviderPortV1 = options.credentialVault
    ? createOfficialYouTubeProvider({
        credentialAccess: createRegistrationCredentialAccess(
          options.credentialVault,
          YOUTUBE_MANIFEST.key,
          options.httpClient,
        ),
        httpClient: options.httpClient ?? new FetchHttpClient(),
      })
    : createOfficialApiStubProvider({ pluginKey: YOUTUBE_MANIFEST.key });

  const providers = new Map<ProviderType, ProviderPortV1>([
    ["make_passive", makePassive],
    ["official_api", officialApi],
  ]);

  return {
    manifest: YOUTUBE_MANIFEST,
    supports(capability: Capability) {
      return (YOUTUBE_CAPABILITIES as readonly string[]).includes(capability);
    },
    getProvider(providerType: string): ProviderPortV1 {
      const provider = providers.get(providerType as ProviderType);
      if (!provider) {
        throw new Error(`Provider not supported for youtube: ${providerType}`);
      }
      return provider;
    },
  };
}

export function createYouTubeRegistration(
  credentialVault: CredentialVaultPortV1,
  options?: Omit<CreateYouTubeAdapterOptions, "credentialVault">,
): PluginRegistration {
  return {
    manifest: YOUTUBE_MANIFEST,
    adapter: createYouTubeAdapter({ credentialVault, ...options }),
  };
}
