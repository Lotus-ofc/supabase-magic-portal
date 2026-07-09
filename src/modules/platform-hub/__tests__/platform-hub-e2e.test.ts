import { describe, expect, it } from "vitest";
import { asScopeRef } from "../../../../contracts/connection/scope-ref.v1";
import { createPlatformHubStack } from "../bootstrap";
import { toHealthInboundSignal } from "../health/adapters/integration-event.adapter";

describe("Platform Hub E2E (in-memory)", () => {
  it("runtime → pipeline → writer → health", async () => {
    const hub = createPlatformHubStack();

    const connection = await hub.connectionService.create({
      pluginKey: "example",
      label: "E2E",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const result = await hub.syncRuntime.execute(connection.connectionId);
    expect(result.status).toBe("success");
    expect(result.envelope?.profile).toBe("metrics-timeseries");

    const pipelineResult = await hub.metricPipeline.accept(result.envelope!);
    expect(pipelineResult.accepted).toBe(true);
    expect(pipelineResult.writerResults[0]?.rowsWritten).toBeGreaterThan(0);
    expect(hub.writer.snapshot().length).toBeGreaterThan(0);

    const health = await hub.healthEngine.get(connection.connectionId);
    expect(health.status).toBe("healthy");

    const events = hub.eventBus.snapshot();
    expect(events.some((event) => event.type === "INTEGRATION_SYNC_FINISHED")).toBe(true);
  });

  it("integration events alimentam Health via adapter", async () => {
    const hub = createPlatformHubStack();
    const connection = await hub.connectionService.create({
      pluginKey: "example",
      label: "Event bridge",
      scopeRef: asScopeRef("cadastro:42"),
    });

    hub.eventBus.on("INTEGRATION_SYNC_FINISHED", async (event) => {
      await hub.healthEngine.accept(toHealthInboundSignal(event));
    });

    const result = await hub.syncRuntime.execute(connection.connectionId);
    expect(result.status).toBe("success");
  });

  it("sync runs persistidos em observability", async () => {
    const hub = createPlatformHubStack();
    const connection = await hub.connectionService.create({
      pluginKey: "example",
      label: "Sync runs",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await hub.syncRuntime.execute(connection.connectionId);
    const runs = await hub.syncRunRepository.listByConnection(connection.connectionId);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("success");
  });

  it("meta_ads make_passive — framework pronto sem API real", async () => {
    const hub = createPlatformHubStack();
    const connection = await hub.connectionService.create({
      pluginKey: "meta_ads",
      label: "Meta passive",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const result = await hub.syncRuntime.execute(connection.connectionId);
    expect(result.status).toBe("success");
    expect(result.envelope?.payload.rows).toHaveLength(0);

    const pipelineResult = await hub.metricPipeline.accept(result.envelope!);
    expect(pipelineResult.accepted).toBe(true);
    expect(pipelineResult.writerResults[0]?.rowsWritten).toBe(0);
  });
});
