import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import type { DiscoveredIdentityV1 } from "./discovered-identity.v1";

interface TikTokAdvertiserResponse {
  code?: number;
  message?: string;
  data?: {
    list?: Array<{
      advertiser_id?: string;
      advertiser_name?: string;
      company?: string;
    }>;
  };
}

/** Descobre business e ad accounts TikTok via Marketing API. */
export async function discoverTikTokIdentities(
  http: HttpClientPort,
  accessToken: string,
  apiVersion = "v1.3",
): Promise<DiscoveredIdentityV1[]> {
  const response = await http.request(
    `https://business-api.tiktok.com/open_api/${apiVersion}/oauth2/advertiser/get/`,
    {
      headers: { "Access-Token": accessToken },
    },
  );

  const body = await response.json<TikTokAdvertiserResponse>();
  if (body.code !== 0) {
    throw new Error(body.message ?? "Falha ao listar advertisers TikTok");
  }

  const results: DiscoveredIdentityV1[] = [];
  const seenBusiness = new Set<string>();

  for (const advertiser of body.data?.list ?? []) {
    const advertiserId = advertiser.advertiser_id;
    if (!advertiserId) continue;

    const company = advertiser.company?.trim();
    if (company && !seenBusiness.has(company)) {
      seenBusiness.add(company);
      results.push({
        identityType: "business",
        externalId: company,
        label: company,
      });
    }

    results.push({
      identityType: "ad_account",
      externalId: advertiserId,
      label: advertiser.advertiser_name ?? advertiserId,
      parentLabel: company,
    });
  }

  return results;
}
