import { createFakeMetricsProvider } from "../../_internal/provider-framework";

export const officialApiFakeProvider = createFakeMetricsProvider({
  pluginKey: "example",
  platformLabel: "example",
  providerType: "official_api",
});
