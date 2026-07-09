import type { CredentialVaultPortV1 } from "../../../../../contracts/credential/credential-vault.v1";
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { createRegistrationCredentialAccess } from "../_internal/oauth/create-registration-credential-access";
import { FetchHttpClient } from "../_internal/http/fetch-http-client";
import { createMakePassiveProvider } from "../_internal/provider-framework/create-make-passive-provider";
import { createOfficialApiStubProvider } from "../_internal/provider-framework/create-official-api-stub-provider";
import { GOOGLE_BUSINESS_CAPABILITIES } from "./google_business.capabilities";
import { GOOGLE_BUSINESS_MANIFEST } from "./google_business.manifest";
import { createOfficialGoogleBusinessProvider } from "./providers/official-google-business.provider";
import type { PluginAdapterPort } from "@/modules/platform-hub/ports";
import type { ProviderPortV1 } from "../../../../../contracts/provider/provider.v1";
import type { ProviderType } from "../../../../../contracts/ingest/ingest-envelope.v1";
import type { Capability } from "../../../../../contracts/plugin/capability.v1";
import type { HttpClientPort } from "../_internal/http/http-client.port";

export interface CreateGoogleBusinessAdapterOptions {
  credentialVault?: CredentialVaultPortV1;
  httpClient?: HttpClientPort;
}

export function createGoogleBusinessAdapter(
  options: CreateGoogleBusinessAdapterOptions = {},
): PluginAdapterPort {
  const makePassive = createMakePassiveProvider({
    pluginKey: GOOGLE_BUSINESS_MANIFEST.key,
    platformLabel: GOOGLE_BUSINESS_MANIFEST.label,
  });

  const officialApi: ProviderPortV1 = options.credentialVault
    ? createOfficialGoogleBusinessProvider({
        credentialAccess: createRegistrationCredentialAccess(
          options.credentialVault,
          GOOGLE_BUSINESS_MANIFEST.key,
          options.httpClient,
        ),
        httpClient: options.httpClient ?? new FetchHttpClient(),
      })
    : createOfficialApiStubProvider({ pluginKey: GOOGLE_BUSINESS_MANIFEST.key });

  const providers = new Map<ProviderType, ProviderPortV1>([
    ["make_passive", makePassive],
    ["official_api", officialApi],
  ]);

  return {
    manifest: GOOGLE_BUSINESS_MANIFEST,
    supports(capability: Capability) {
      return (GOOGLE_BUSINESS_CAPABILITIES as readonly string[]).includes(capability);
    },
    getProvider(providerType: string): ProviderPortV1 {
      const provider = providers.get(providerType as ProviderType);
      if (!provider) {
        throw new Error(`Provider not supported for google_business: ${providerType}`);
      }
      return provider;
    },
  };
}

export function createGoogleBusinessRegistration(
  credentialVault: CredentialVaultPortV1,
  options?: Omit<CreateGoogleBusinessAdapterOptions, "credentialVault">,
): PluginRegistration {
  return {
    manifest: GOOGLE_BUSINESS_MANIFEST,
    adapter: createGoogleBusinessAdapter({ credentialVault, ...options }),
  };
}
