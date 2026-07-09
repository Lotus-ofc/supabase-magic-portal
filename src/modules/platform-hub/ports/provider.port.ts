/**
 * ProviderPort — transporte de dados de/para plataforma externa.
 *
 * @implements plugins/providers/*.provider.ts (ex.: fake.provider no example)
 * @consumes PluginAdapterPort.getProvider()
 * @first-use Fase -1 (example fake); framework Fase 3
 */
import type { IngestEnvelopeV1 } from "./types";
import type { CollectParamsV1, ProviderPortV1 } from "../../../../contracts/provider/provider.v1";

export type { CollectParamsV1 };

export type ProviderPort = ProviderPortV1;

export type { IngestEnvelopeV1 };
