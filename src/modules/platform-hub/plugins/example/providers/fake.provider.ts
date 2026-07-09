/**
 * Provider fake do example plugin — framework Fase 3.
 */
import { asConnectionId } from "../../../../../../contracts/connection/connection-id.v1";
import { createFakeMetricsProvider } from "../../_internal/provider-framework";

export const fakeProvider = createFakeMetricsProvider({
  pluginKey: "example",
  platformLabel: "example",
});

/** ConnectionId fixo para testes do example plugin. */
export const EXAMPLE_CONNECTION_ID = asConnectionId("00000000-0000-4000-8000-000000000001");
