import { createMarketingAdapter } from "../_internal/provider-framework";
import { YOUTUBE_MANIFEST } from "./youtube.manifest";
import { YOUTUBE_CAPABILITIES } from "./youtube.capabilities";

export const YoutubeAdapter = createMarketingAdapter({
  manifest: YOUTUBE_MANIFEST,
  capabilities: YOUTUBE_CAPABILITIES,
  platformLabel: YOUTUBE_MANIFEST.label,
});
