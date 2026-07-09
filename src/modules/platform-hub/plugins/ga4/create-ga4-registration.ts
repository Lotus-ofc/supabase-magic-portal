import type { CredentialVaultPortV1 } from "../../../../../contracts/credential/credential-vault.v1";
import type { PluginRegistration } from "@/modules/platform-hub/ports";
import { createRegistrationCredentialAccess } from "../_internal/oauth/create-registration-credential-access";
import { FetchHttpClient } from "../_internal/http/fetch-http-client";
import { createMakePassiveProvider } from "../_internal/provider-framework/create-make-passive-provider";
import { createOfficialApiStubProvider } from "../_internal/provider-framework/create-official-api-stub-provider";
import { GA4_CAPABILITIES } from "./ga4.capabilities";
import { GA4_MANIFEST } from "./ga4.manifest";
import { createOfficialGa4Provider } from "./providers/official-ga4.provider";
import type { PluginAdapterPort } from "@/modules/platform-hub/ports";
import type { ProviderPortV1 } from "../../../../../contracts/provider/provider.v1";
import type { ProviderType } from "../../../../../contracts/ingest/ingest-envelope.v1";
import type { Capability } from "../../../../../contracts/plugin/capability.v1";
import type { HttpClientPort } from "../_internal/http/http-client.port";

export interface CreateGa4AdapterOptions {
  credentialVault?: CredentialVaultPortV1;
  httpClient?: HttpClientPort;
}

export function createGa4Adapter(options: CreateGa4AdapterOptions = {}): PluginAdapterPort {
  const makePassive = createMakePassiveProvider({
    pluginKey: GA4_MANIFEST.key,
    platformLabel: GA4_MANIFEST.label,
  });

  const officialApi: ProviderPortV1 = options.credentialVault
    ? createOfficialGa4Provider({
        credentialAccess: createRegistrationCredentialAccess(
          options.credentialVault,
          GA4_MANIFEST.key,
          options.httpClient,
        ),
        httpClient: options.httpClient ?? new FetchHttpClient(),
      })
    : createOfficialApiStubProvider({ pluginKey: GA4_MANIFEST.key });

  const providers = new Map<ProviderType, ProviderPortV1>([
    ["make_passive", makePassive],
    ["official_api", officialApi],
  ]);

  return {
    manifest: GA4_MANIFEST,
    supports(capability: Capability) {
      return (GA4_CAPABILITIES as readonly string[]).includes(capability);
    },
    getProvider(providerType: string): ProviderPortV1 {
      const provider = providers.get(providerType as ProviderType);
      if (!provider) {
        throw new Error(`Provider not supported for ga4: ${providerType}`);
      }
      return provider;
    },
  };
}

export function createGa4Registration(
  credentialVault: CredentialVaultPortV1,
  options?: Omit<CreateGa4AdapterOptions, "credentialVault">,
): PluginRegistration {
  return {
    manifest: GA4_MANIFEST,
    adapter: createGa4Adapter({ credentialVault, ...options }),
  };
}
