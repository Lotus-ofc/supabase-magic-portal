import { describe, expect, it } from "vitest";
import { asConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import { isMetricsTimeseriesEnvelope } from "../../../../../contracts/ingest/ingest-envelope.v1";
import { METRIC_BATCH_CONTRACT_VERSION } from "../../../../../contracts/ingest/profiles/metrics-timeseries.v1";
import { createLegacyCadastroBridge } from "@/modules/platform-hub-bridges/legacy-cadastro";
import { createConnectionResolver } from "../create-connection-resolver";
import { ExampleAdapter } from "../../plugins/example/example.adapter";
import { EXAMPLE_CONNECTION_ID } from "../../plugins/example/providers/fake.provider";
import { collectIngestEnvelope } from "../../plugins/_internal/provider-framework";

describe("Fase 3 — ConnectionResolver", () => {
  it("resolve ConnectionId → ScopeRef via bridge", async () => {
    const resolver = createConnectionResolver(createLegacyCadastroBridge());

    const scopeRef = await resolver.resolveScopeRef(EXAMPLE_CONNECTION_ID);
    expect(scopeRef).toBe("cadastro:42");
  });

  it("resolve ConnectionId → nome canônico via bridge", async () => {
    const resolver = createConnectionResolver(createLegacyCadastroBridge());

    const name = await resolver.resolveCanonicalClientName(EXAMPLE_CONNECTION_ID);
    expect(name).toBe("acme_corp");
  });

  it("resolve() expõe connectionId sem vazar legado ao caller", async () => {
    const resolver = createConnectionResolver(createLegacyCadastroBridge());

    const connection = await resolver.resolve(EXAMPLE_CONNECTION_ID);
    expect(connection.connectionId).toBe(EXAMPLE_CONNECTION_ID);
    expect(connection.scopeRef).toBe("cadastro:42");
  });

  it("rejeita ConnectionId desconhecido", async () => {
    const resolver = createConnectionResolver(createLegacyCadastroBridge());

    await expect(
      resolver.resolveScopeRef(asConnectionId("00000000-0000-4000-8000-000000009999")),
    ).rejects.toThrow(/Connection not found/);
  });
});

describe("Fase 3 — fluxo Provider → IngestEnvelope", () => {
  it("provider isolado retorna envelope sem nome canônico", async () => {
    const provider = new ExampleAdapter().getProvider("make_passive");
    const raw = await provider.collect({
      connectionId: EXAMPLE_CONNECTION_ID,
      capability: "example:metrics:collect",
      identities: [],
    });
    if (!isMetricsTimeseriesEnvelope(raw)) throw new Error("expected metrics-timeseries");
    expect(raw.payload.canonicalClientName).toBe("");
  });

  it("produz IngestEnvelope válido sem pipeline, banco ou runtime", async () => {
    const bridge = createLegacyCadastroBridge();
    const resolver = createConnectionResolver(bridge);
    const connection = await resolver.resolve(EXAMPLE_CONNECTION_ID);

    const adapter = new ExampleAdapter();
    const provider = adapter.getProvider("make_passive");

    const envelope = await collectIngestEnvelope({
      resolver,
      provider,
      connectionId: connection.connectionId,
      capability: "example:metrics:collect",
    });

    expect(isMetricsTimeseriesEnvelope(envelope)).toBe(true);
    if (!isMetricsTimeseriesEnvelope(envelope)) throw new Error("expected metrics-timeseries");

    expect(envelope.connectionId).toBe(EXAMPLE_CONNECTION_ID);
    expect(envelope.payload.version).toBe(METRIC_BATCH_CONTRACT_VERSION);
    expect(envelope.payload.canonicalClientName).toBe("acme_corp");
    expect(envelope.payload.rows[0]?.metricKey).toBe("impressions");
  });
});
