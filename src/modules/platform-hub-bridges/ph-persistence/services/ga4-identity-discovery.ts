import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import type { DiscoveredIdentityV1 } from "./discovered-identity.v1";

interface AccountSummariesResponse {
  accountSummaries?: Array<{
    account?: string;
    displayName?: string;
    propertySummaries?: Array<{
      property?: string;
      displayName?: string;
    }>;
  }>;
  error?: { message: string };
}

/** Descobre contas e propriedades GA4 via Analytics Admin API. */
export async function discoverGa4Identities(
  http: HttpClientPort,
  accessToken: string,
): Promise<DiscoveredIdentityV1[]> {
  const results: DiscoveredIdentityV1[] = [];

  const response = await http.request(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      searchParams: { pageSize: "200" },
    },
  );
  const body = await response.json<AccountSummariesResponse>();
  if (body.error?.message) throw new Error(body.error.message);

  for (const summary of body.accountSummaries ?? []) {
    const accountId = summary.account?.replace(/^accounts\//, "") ?? "";
    const accountLabel = summary.displayName ?? accountId;
    if (accountId) {
      results.push({
        identityType: "account",
        externalId: accountId,
        label: accountLabel,
      });
    }

    for (const property of summary.propertySummaries ?? []) {
      const propertyId = property.property?.replace(/^properties\//, "") ?? "";
      if (!propertyId) continue;
      results.push({
        identityType: "property",
        externalId: propertyId,
        label: property.displayName ?? propertyId,
        parentLabel: accountLabel,
      });
    }
  }

  return results;
}
