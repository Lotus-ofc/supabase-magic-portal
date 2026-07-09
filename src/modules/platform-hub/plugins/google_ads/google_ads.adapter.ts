import { createMarketingAdapter } from "../_internal/provider-framework";
import { GOOGLE_ADS_MANIFEST } from "./google_ads.manifest";
import { GOOGLE_ADS_CAPABILITIES } from "./google_ads.capabilities";

export const GoogleAdsAdapter = createMarketingAdapter({
  manifest: GOOGLE_ADS_MANIFEST,
  capabilities: GOOGLE_ADS_CAPABILITIES,
  platformLabel: GOOGLE_ADS_MANIFEST.label,
});
