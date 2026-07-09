import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import type { DiscoveredIdentityV1 } from "./discovered-identity.v1";

interface ListAccessibleCustomersResponse {
  resourceNames?: string[];
  error?: { message: string };
}

interface GoogleAdsSearchResponse {
  results?: Array<{
    customer?: { id?: string; descriptiveName?: string; manager?: boolean };
  }>;
  error?: { message: string };
}

function customerIdFromResource(resourceName: string): string {
  return resourceName.replace(/^customers\//, "");
}

/** Descobre contas Google Ads acessíveis ao token OAuth. */
export async function discoverGoogleAdsIdentities(
  http: HttpClientPort,
  accessToken: string,
  developerToken?: string,
): Promise<DiscoveredIdentityV1[]> {
  const devToken = developerToken?.trim() || process.env.GOOGLE_ADS_DEVELOPER_TOKEN?.trim();
  if (!devToken) {
    throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN é obrigatório para descoberta Google Ads");
  }

  const listResponse = await http.request(
    "https://googleads.googleapis.com/v19/customers:listAccessibleCustomers",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "developer-token": devToken,
      },
    },
  );
  const listBody = await listResponse.json<ListAccessibleCustomersResponse>();
  if (listBody.error?.message) throw new Error(listBody.error.message);

  const results: DiscoveredIdentityV1[] = [];
  const seen = new Set<string>();
  for (const resourceName of listBody.resourceNames ?? []) {
    const customerId = customerIdFromResource(resourceName);
    if (seen.has(customerId)) continue;
    seen.add(customerId);
    try {
      const detailResponse = await http.request(
        `https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:search`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "developer-token": devToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: `SELECT customer.id, customer.descriptive_name, customer.manager FROM customer WHERE customer.id = ${customerId}`,
          }),
        },
      );
      const detailBody = await detailResponse.json<GoogleAdsSearchResponse>();
      const customer = detailBody.results?.[0]?.customer;
      results.push({
        identityType: customer?.manager ? "manager" : "customer",
        externalId: customerId,
        label: customer?.descriptiveName ?? customerId,
      });
    } catch {
      results.push({
        identityType: "customer",
        externalId: customerId,
        label: customerId,
      });
    }
  }

  return results;
}
