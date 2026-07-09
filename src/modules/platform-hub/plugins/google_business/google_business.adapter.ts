import { createMarketingAdapter } from "../_internal/provider-framework";
import { GOOGLE_BUSINESS_MANIFEST } from "./google_business.manifest";
import { GOOGLE_BUSINESS_CAPABILITIES } from "./google_business.capabilities";

export const GoogleBusinessAdapter = createMarketingAdapter({
  manifest: GOOGLE_BUSINESS_MANIFEST,
  capabilities: GOOGLE_BUSINESS_CAPABILITIES,
  platformLabel: GOOGLE_BUSINESS_MANIFEST.label,
});
