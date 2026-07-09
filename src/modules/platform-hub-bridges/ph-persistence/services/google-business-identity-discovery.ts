import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import type { DiscoveredIdentityV1 } from "./discovered-identity.v1";

interface AccountsResponse {
  accounts?: Array<{ name?: string; accountName?: string }>;
  error?: { message: string };
}

interface LocationsResponse {
  locations?: Array<{ name?: string; title?: string; storefrontAddress?: { locality?: string } }>;
  error?: { message: string };
}

/** Descobre contas e locations Google Business Profile. */
export async function discoverGoogleBusinessIdentities(
  http: HttpClientPort,
  accessToken: string,
): Promise<DiscoveredIdentityV1[]> {
  const results: DiscoveredIdentityV1[] = [];

  const accountsResponse = await http.request(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      searchParams: { pageSize: "100" },
    },
  );
  const accountsBody = await accountsResponse.json<AccountsResponse>();
  if (accountsBody.error?.message) throw new Error(accountsBody.error.message);

  for (const account of accountsBody.accounts ?? []) {
    const accountName = account.name ?? "";
    const accountId = accountName.replace(/^accounts\//, "");
    const accountLabel = account.accountName ?? accountId;
    if (accountId) {
      results.push({
        identityType: "account",
        externalId: accountId,
        label: accountLabel,
      });
    }

    if (!accountName) continue;

    try {
      const locationsResponse = await http.request(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          searchParams: { pageSize: "100", readMask: "name,title,storefrontAddress" },
        },
      );
      const locationsBody = await locationsResponse.json<LocationsResponse>();
      for (const location of locationsBody.locations ?? []) {
        const locationName = location.name ?? "";
        const locationId = locationName.replace(/^.*\/locations\//, "");
        if (!locationId) continue;
        results.push({
          identityType: "location",
          externalId: locationId,
          label: location.title ?? locationId,
          parentLabel: accountLabel,
        });
      }
    } catch {
      // conta sem locations acessíveis
    }
  }

  return results;
}
