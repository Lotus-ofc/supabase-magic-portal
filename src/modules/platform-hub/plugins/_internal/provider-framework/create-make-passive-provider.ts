import type { PluginKey } from "../../../../../contracts/plugin/capability.v1";
import type {
  CollectParamsV1,
  ProviderPortV1,
} from "../../../../../contracts/provider/provider.v1";
import type { MetricsTimeseriesIngestEnvelopeV1 } from "../../../../../contracts/ingest/ingest-envelope.v1";
import { METRIC_BATCH_CONTRACT_VERSION } from "../../../../../../contracts/ingest/profiles/metrics-timeseries.v1";

export interface MakePassiveProviderConfig {
  pluginKey: PluginKey;
  platformLabel: string;
}

/**
 * Provider make_passive — dual-run: Make continua dono da ingestão.
 * Retorna envelope vazio; Hub não coleta ativamente nesta fase.
 */
export function createMakePassiveProvider(config: MakePassiveProviderConfig): ProviderPortV1 {
  return {
    providerType: "make_passive",
    async collect(params: CollectParamsV1): Promise<MetricsTimeseriesIngestEnvelopeV1> {
      const today = new Date().toISOString().slice(0, 10);
      const window = params.window ?? { from: today, to: today };

      return {
        version: "1.0.0",
        connectionId: params.connectionId,
        pluginKey: config.pluginKey,
        providerType: "make_passive",
        profile: "metrics-timeseries",
        collectedAt: new Date().toISOString(),
        payload: {
          version: METRIC_BATCH_CONTRACT_VERSION,
          connectionId: params.connectionId,
          platformLabel: config.platformLabel,
          canonicalClientName: "",
          window,
          rows: [],
          source: { pluginKey: config.pluginKey, providerType: "make_passive" },
        },
      };
    },
  };
}
