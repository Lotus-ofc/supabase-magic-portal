import { describe, expect, it } from "vitest";
import { asScopeRef } from "../../../../../contracts/connection/scope-ref.v1";
import { INTEGRATION_EVENTS_CONTRACT_VERSION } from "../../../../../contracts/events/integration-events.v1";
import type { ConnectionId } from "../../../../../contracts/connection/connection-id.v1";
import type { PluginKey } from "../../../../../contracts/plugin/capability.v1";
import { createConnectionStack } from "../../connections/create-connection-stack";
import { createHealthStack } from "../create-health-stack";

function syncFinished(connectionId: ConnectionId, pluginKey: PluginKey, at: string) {
  return {
    version: INTEGRATION_EVENTS_CONTRACT_VERSION,
    type: "INTEGRATION_SYNC_FINISHED" as const,
    connectionId,
    pluginKey,
    occurredAt: at,
    payload: { latencyMs: 100, rowsCount: 10, providerType: "make_passive" },
  };
}

function rateLimit(connectionId: ConnectionId, pluginKey: PluginKey, at: string) {
  return {
    version: INTEGRATION_EVENTS_CONTRACT_VERSION,
    type: "INTEGRATION_RATE_LIMIT_HIT" as const,
    connectionId,
    pluginKey,
    occurredAt: at,
    payload: { retryAfterMs: 60_000 },
  };
}

function tokenExpiring(connectionId: ConnectionId, pluginKey: PluginKey, at: string) {
  return {
    version: INTEGRATION_EVENTS_CONTRACT_VERSION,
    type: "INTEGRATION_CREDENTIAL_EXPIRING" as const,
    connectionId,
    pluginKey,
    occurredAt: at,
    payload: { expiresAt: "2026-12-31T00:00:00.000Z" },
  };
}

describe("Fase 5 — HealthEngine", () => {
  it("health inicial é unknown sem sinais", async () => {
    const { connectionService } = createConnectionStack();
    const { healthEngine } = createHealthStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Health init",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const snapshot = await healthEngine.get(connection.connectionId);
    expect(snapshot.status).toBe("unknown");
    expect(snapshot.score).toBe(0);
    expect(snapshot.breakdown).toHaveLength(5);
  });

  it("atualiza snapshot por evento accept()", async () => {
    const { connectionService } = createConnectionStack();
    const { healthEngine } = createHealthStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Events",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const recentlySyncedAt = new Date(Date.now() - 60_000).toISOString();
    await healthEngine.accept(
      syncFinished(connection.connectionId, connection.pluginKey, recentlySyncedAt),
    );

    const snapshot = await healthEngine.get(connection.connectionId);
    expect(snapshot.status).toBe("healthy");
    expect(snapshot.score).toBeGreaterThanOrEqual(80);
    expect(snapshot.breakdown.find((b) => b.evaluatorKey === "freshness")?.score).toBe(25);
  });

  it("reconcile recalcula estado a partir do SignalStore", async () => {
    const { connectionService } = createConnectionStack();
    const { healthEngine } = createHealthStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Reconcile",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await healthEngine.accept(
      syncFinished(connection.connectionId, connection.pluginKey, "2026-07-07T12:00:00.000Z"),
    );
    await healthEngine.accept(
      rateLimit(connection.connectionId, connection.pluginKey, "2026-07-07T12:01:00.000Z"),
    );

    const reconciled = await healthEngine.reconcile(connection.connectionId);
    expect(reconciled.breakdown.find((b) => b.evaluatorKey === "quota")?.score).toBe(15);
  });

  it("compõe score via múltiplos evaluators", async () => {
    const { connectionService } = createConnectionStack();
    const { healthEngine } = createHealthStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Evaluators",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await healthEngine.accept(
      syncFinished(connection.connectionId, connection.pluginKey, new Date().toISOString()),
    );
    await healthEngine.accept(
      tokenExpiring(connection.connectionId, connection.pluginKey, new Date().toISOString()),
    );

    const snapshot = await healthEngine.get(connection.connectionId);
    const keys = snapshot.breakdown.map((b) => b.evaluatorKey);
    expect(keys).toEqual(["freshness", "credential", "quota", "failure", "version"]);
    expect(snapshot.score).toBe(25 + 12 + 20 + 20 + 10);
  });

  it("eventos fora de ordem produzem snapshot determinístico", async () => {
    const { connectionService } = createConnectionStack();
    const { healthEngine } = createHealthStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Order",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await healthEngine.accept(
      tokenExpiring(connection.connectionId, connection.pluginKey, "2026-07-07T14:00:00.000Z"),
    );
    await healthEngine.accept(
      syncFinished(connection.connectionId, connection.pluginKey, "2026-07-07T12:00:00.000Z"),
    );

    const first = await healthEngine.reconcile(connection.connectionId);
    const second = await healthEngine.reconcile(connection.connectionId);

    expect(first.score).toBe(second.score);
    expect(first.status).toBe(second.status);
    expect(first.breakdown).toEqual(second.breakdown);
  });

  it("connections isoladas não compartilham sinais", async () => {
    const { connectionService } = createConnectionStack();
    const { healthEngine } = createHealthStack();

    const a = await connectionService.create({
      pluginKey: "example",
      label: "A",
      scopeRef: asScopeRef("cadastro:42"),
    });
    const b = await connectionService.create({
      pluginKey: "meta_ads",
      label: "B",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await healthEngine.accept(syncFinished(a.connectionId, a.pluginKey, new Date().toISOString()));

    const snapshotA = await healthEngine.get(a.connectionId);
    const snapshotB = await healthEngine.get(b.connectionId);

    expect(snapshotA.status).toBe("healthy");
    expect(snapshotB.status).toBe("unknown");
  });

  it("critério de sucesso — accept múltiplos sinais e get snapshot", async () => {
    const { connectionService } = createConnectionStack();
    const { healthEngine } = createHealthStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "E2E Health",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await healthEngine.accept(
      syncFinished(connection.connectionId, connection.pluginKey, new Date().toISOString()),
    );
    await healthEngine.accept(
      rateLimit(connection.connectionId, connection.pluginKey, new Date().toISOString()),
    );
    await healthEngine.accept(
      tokenExpiring(connection.connectionId, connection.pluginKey, new Date().toISOString()),
    );

    const snapshot = await healthEngine.get(connection.connectionId);

    expect(snapshot.connectionId).toBe(connection.connectionId);
    expect(snapshot.status).toBeDefined();
    expect(snapshot.score).toBeGreaterThan(0);
    expect(snapshot.lastUpdated).toBeTruthy();
    expect(snapshot.breakdown.length).toBe(5);
  });

  it("ManualReconciliationScheduler reconcilia sem Runtime", async () => {
    const { connectionService } = createConnectionStack();
    const { healthEngine, reconciliationScheduler } = createHealthStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Scheduler",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await healthEngine.accept(
      syncFinished(connection.connectionId, connection.pluginKey, new Date().toISOString()),
    );

    await reconciliationScheduler.reconcile(connection.connectionId);
    const snapshot = await healthEngine.get(connection.connectionId);
    expect(snapshot.status).toBe("healthy");
  });
});
