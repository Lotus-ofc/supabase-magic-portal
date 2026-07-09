import { createMarketingAdapter } from "../_internal/provider-framework";
import { TIKTOK_MANIFEST } from "./tiktok.manifest";
import { TIKTOK_CAPABILITIES } from "./tiktok.capabilities";

export const TiktokAdapter = createMarketingAdapter({
  manifest: TIKTOK_MANIFEST,
  capabilities: TIKTOK_CAPABILITIES,
  platformLabel: TIKTOK_MANIFEST.label,
});
