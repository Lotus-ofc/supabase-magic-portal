import { CREDENTIAL_VAULT_CONTRACT_VERSION } from "../../../../contracts/credential/credential-vault.v1";
import type { InMemoryCredentialVault } from "@/modules/platform-hub/connections/credential-vault/in-memory-credential-vault";
import type { HubRegistryPort } from "@/modules/platform-hub/ports";
import { FetchHttpClient } from "@/modules/platform-hub/plugins/_internal/http/fetch-http-client";
import type {
  HttpClientPort,
  HttpRequestInitV1,
} from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import { MockHttpClient } from "@/modules/platform-hub/plugins/_internal/http/mock-http-client";
import { withHttpRetry } from "@/modules/platform-hub/plugins/_internal/http/retry-http";
import { createCredentialAccess } from "@/modules/platform-hub/plugins/_internal/oauth/credential-access.port";
import { META_OAUTH_CREDENTIAL_KEY } from "@/modules/platform-hub/plugins/meta_ads/meta-credential-keys";
import { createOfficialMetaProvider } from "@/modules/platform-hub/plugins/meta_ads/providers/official-meta.provider";
import type { HubObservabilityPort } from "@/modules/platform-hub/observability/ports";

const DEMO_INSIGHTS = {
  data: [
    {
      campaign_name: "Campanha A",
      date_start: "2026-07-01",
      date_stop: "2026-07-01",
      impressions: "1000",
      reach: "800",
      clicks: "50",
      spend: "25.50",
    },
    {
      campaign_name: "Campanha A",
      date_start: "2026-07-02",
      date_stop: "2026-07-02",
      impressions: "1100",
      reach: "850",
      clicks: "55",
      spend: "26.00",
    },
  ],
};

export interface PatchOfficialMetaProviderInput {
  registry: HubRegistryPort;
  credentialVault: InMemoryCredentialVault;
  mode: "demo" | "live";
  graphVersion?: string;
  observability?: HubObservabilityPort;
}

/** HttpClient live com retry por request — bridge Gate A only. */
function createGateALiveHttpClient(): HttpClientPort {
  const client = new FetchHttpClient();
  return {
    request(url: string, init?: HttpRequestInitV1) {
      return withHttpRetry(() => client.request(url, init));
    },
  };
}

/** Injeta HttpClient no provider oficial — somente para execução Gate A. */
export function patchOfficialMetaProvider(input: PatchOfficialMetaProviderInput): void {
  const registration = input.registry.getPlugin("meta_ads");
  const originalGetProvider = registration.adapter.getProvider.bind(registration.adapter);

  registration.adapter.getProvider = (providerType: string) => {
    if (providerType !== "official_api") {
      return originalGetProvider(providerType);
    }

    const httpClient =
      input.mode === "demo"
        ? new MockHttpClient([
            {
              match: (url) => url.includes("/insights"),
              respond: () => ({ body: DEMO_INSIGHTS }),
            },
          ])
        : createGateALiveHttpClient();

    return createOfficialMetaProvider({
      credentialAccess: createCredentialAccess(input.credentialVault),
      httpClient,
      graphVersion: input.graphVersion,
      observability: input.observability,
    });
  };
}

export async function storeMetaAccessToken(
  credentialVault: InMemoryCredentialVault,
  connectionId: Parameters<InMemoryCredentialVault["store"]>[0],
  accessToken: string,
): Promise<void> {
  await credentialVault.store(connectionId, META_OAUTH_CREDENTIAL_KEY, {
    version: CREDENTIAL_VAULT_CONTRACT_VERSION,
    data: { accessToken },
  });
}
