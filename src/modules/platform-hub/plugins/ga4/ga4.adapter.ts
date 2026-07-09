import { createMarketingAdapter } from "../_internal/provider-framework";
import { GA4_MANIFEST } from "./ga4.manifest";
import { GA4_CAPABILITIES } from "./ga4.capabilities";

export const Ga4Adapter = createMarketingAdapter({
  manifest: GA4_MANIFEST,
  capabilities: GA4_CAPABILITIES,
  platformLabel: GA4_MANIFEST.label,
});
