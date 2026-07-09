import type { HttpClientPort } from "@/modules/platform-hub/plugins/_internal/http/http-client.port";
import type { DiscoveredIdentityV1 } from "./discovered-identity.v1";

interface YouTubeChannelsResponse {
  items?: Array<{
    id?: string;
    snippet?: { title?: string; customUrl?: string };
  }>;
  error?: { message: string };
}

/** Descobre canais YouTube vinculados ao token OAuth. */
export async function discoverYouTubeIdentities(
  http: HttpClientPort,
  accessToken: string,
): Promise<DiscoveredIdentityV1[]> {
  const response = await http.request("https://www.googleapis.com/youtube/v3/channels", {
    headers: { Authorization: `Bearer ${accessToken}` },
    searchParams: {
      part: "snippet",
      mine: "true",
      maxResults: "50",
    },
  });

  const body = await response.json<YouTubeChannelsResponse>();
  if (body.error?.message) throw new Error(body.error.message);

  return (body.items ?? [])
    .filter((item) => item.id)
    .map((item) => ({
      identityType: "channel",
      externalId: item.id!,
      label: item.snippet?.title ?? item.snippet?.customUrl ?? item.id!,
    }));
}
