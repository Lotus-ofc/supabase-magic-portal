import { describe, expect, it } from "vitest";
import { asScopeRef } from "../../../../../contracts/connection/scope-ref.v1";
import type {
  CollectParamsV1,
  ProviderPortV1,
} from "../../../../../contracts/provider/provider.v1";
import { isMetricsTimeseriesEnvelope } from "../../../../../contracts/ingest/ingest-envelope.v1";
import { createFakeMetricsProvider } from "../../plugins/_internal/provider-framework";
import { createRuntimeStack } from "../create-runtime-stack";
import { SyncOrchestrator } from "../sync-orchestrator";
import { RetryExecutor, SimpleRetryPolicy } from "../retry/retry-executor";
import { InMemoryRuntimeRepository } from "../repositories/in-memory-runtime.repository";
import { InMemoryRuntimeMetrics } from "../metrics/in-memory-runtime-metrics";
import { SyncRuntime } from "../sync-runtime";

function createStackWithProvider(provider: ProviderPortV1, retryMaxAttempts = 3) {
  const base = createRuntimeStack({ retryMaxAttempts });
  const orchestrator = new SyncOrchestrator(
    base.connectionService,
    base.identityService,
    base.resolver,
    async () => provider,
  );
  const syncRuntime = new SyncRuntime(
    base.connectionService,
    orchestrator,
    base.healthEngine,
    base.runtimeRepository,
    base.retryExecutor,
    new SimpleRetryPolicy(retryMaxAttempts),
    base.runtimeMetrics,
  );
  return { ...base, orchestrator, syncRuntime };
}

function createFlakyProvider(
  failUntilAttempt: number,
): ProviderPortV1 & { attempts: () => number } {
  let count = 0;
  const inner = createFakeMetricsProvider({
    pluginKey: "example",
    platformLabel: "Example",
  });

  return {
    providerType: "make_passive",
    attempts: () => count,
    async collect(params: CollectParamsV1) {
      count += 1;
      if (count < failUntilAttempt) {
        throw new Error(`transient failure #${count}`);
      }
      return inner.collect(params);
    },
  };
}

function createAlwaysFailingProvider(): ProviderPortV1 {
  return {
    providerType: "make_passive",
    async collect() {
      throw new Error("provider permanently failed");
    },
  };
}

describe("Fase 6 — SyncRuntime", () => {
  it("critério de sucesso — execução simples retorna IngestEnvelope", async () => {
    const { syncRuntime, connectionService } = createRuntimeStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Runtime simple",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const result = await syncRuntime.execute(connection.connectionId);

    expect(result.status).toBe("success");
    expect(result.envelope?.profile).toBe("metrics-timeseries");
    expect(result.connectionId).toBe(connection.connectionId);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("executa múltiplas connections de forma isolada", async () => {
    const { manualScheduler, connectionService } = createRuntimeStack();

    const example = await connectionService.create({
      pluginKey: "example",
      label: "Example",
      scopeRef: asScopeRef("cadastro:42"),
    });
    const meta = await connectionService.create({
      pluginKey: "meta_ads",
      label: "Meta",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const results = await manualScheduler.runAll([example.connectionId, meta.connectionId]);

    expect(results).toHaveLength(2);
    expect(results[0]?.status).toBe("success");
    expect(results[1]?.status).toBe("success");
    expect(results[0]?.connectionId).not.toBe(results[1]?.connectionId);
    expect(results[0]?.envelope?.pluginKey).toBe("example");
    expect(results[1]?.envelope?.pluginKey).toBe("meta_ads");
  });

  it("retry — provider falha e recupera dentro da política", async () => {
    const provider = createFlakyProvider(3);
    const { syncRuntime, connectionService } = createStackWithProvider(provider, 3);

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Retry",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const result = await syncRuntime.execute(connection.connectionId);

    expect(result.status).toBe("success");
    expect(provider.attempts()).toBe(3);
    expect(result.envelope?.profile).toBe("metrics-timeseries");
  });

  it("provider falhando — retorna ExecutionResult failed", async () => {
    const { syncRuntime, connectionService, runtimeRepository } = createStackWithProvider(
      createAlwaysFailingProvider(),
      2,
    );

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Fail",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const result = await syncRuntime.execute(connection.connectionId);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("provider permanently failed");
    expect(result.envelope).toBeUndefined();

    const history = await runtimeRepository.listByConnection(connection.connectionId);
    expect(history).toHaveLength(1);
    expect(history[0]?.status).toBe("failed");
  });

  it("provider bem sucedido — persiste histórico e métricas", async () => {
    const { syncRuntime, connectionService, runtimeRepository, runtimeMetrics } =
      createRuntimeStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Success metrics",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await syncRuntime.execute(connection.connectionId);

    const history = await runtimeRepository.listByConnection(connection.connectionId);
    expect(history[0]?.providerType).toBe("make_passive");
    expect(history[0]?.startedAt).toBeTruthy();
    expect(history[0]?.finishedAt).toBeTruthy();

    const metrics = runtimeMetrics.snapshot(connection.connectionId);
    expect(metrics.totalExecutions).toBe(1);
    expect(metrics.successCount).toBe(1);
    expect(metrics.failedCount).toBe(0);
  });

  it("integração com Health — Runtime emite sinal, Health calcula snapshot", async () => {
    const { syncRuntime, connectionService, healthEngine } = createRuntimeStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Health bridge",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const before = await healthEngine.get(connection.connectionId);
    expect(before.status).toBe("unknown");

    await syncRuntime.execute(connection.connectionId);

    const after = await healthEngine.get(connection.connectionId);
    expect(after.status).toBe("healthy");
    expect(after.breakdown.find((b) => b.evaluatorKey === "freshness")?.score).toBe(25);
  });

  it("integração com Health — falhas consecutivas degradam failure evaluator", async () => {
    const { syncRuntime, connectionService, healthEngine } = createStackWithProvider(
      createAlwaysFailingProvider(),
      1,
    );

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Health fail",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await syncRuntime.execute(connection.connectionId);
    await syncRuntime.execute(connection.connectionId);

    const snapshot = await healthEngine.get(connection.connectionId);
    const failure = snapshot.breakdown.find((b) => b.evaluatorKey === "failure");
    expect(failure?.score).toBeLessThan(20);
  });

  it("connections isoladas — histórico e health independentes", async () => {
    const { syncRuntime, connectionService, runtimeRepository, healthEngine } =
      createRuntimeStack();

    const ok = await connectionService.create({
      pluginKey: "example",
      label: "OK",
      scopeRef: asScopeRef("cadastro:42"),
    });
    const failStack = createStackWithProvider(createAlwaysFailingProvider(), 1);
    const bad = await failStack.connectionService.create({
      pluginKey: "example",
      label: "Bad",
      scopeRef: asScopeRef("cadastro:99"),
    });

    await syncRuntime.execute(ok.connectionId);
    await failStack.syncRuntime.execute(bad.connectionId);

    const okHistory = await runtimeRepository.listByConnection(ok.connectionId);
    const badHistory = await failStack.runtimeRepository.listByConnection(bad.connectionId);

    expect(okHistory[0]?.status).toBe("success");
    expect(badHistory[0]?.status).toBe("failed");

    expect((await healthEngine.get(ok.connectionId)).status).toBe("healthy");
    expect((await failStack.healthEngine.get(bad.connectionId)).status).not.toBe("healthy");
  });

  it("determinismo — mesma connection produz envelopes equivalentes", async () => {
    const { syncRuntime, connectionService } = createRuntimeStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Deterministic",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const first = await syncRuntime.execute(connection.connectionId);
    const second = await syncRuntime.execute(connection.connectionId);

    expect(first.executionId).not.toBe(second.executionId);
    expect(first.envelope?.profile).toBe(second.envelope?.profile);
    expect(first.envelope?.pluginKey).toBe(second.envelope?.pluginKey);

    if (
      isMetricsTimeseriesEnvelope(first.envelope) &&
      isMetricsTimeseriesEnvelope(second.envelope)
    ) {
      expect(first.envelope.payload.rows[0]?.metricKey).toBe(
        second.envelope.payload.rows[0]?.metricKey,
      );
    }
  });

  it("ManualScheduler delega para SyncRuntime", async () => {
    const { manualScheduler, connectionService } = createRuntimeStack();

    const connection = await connectionService.create({
      pluginKey: "example",
      label: "Scheduler",
      scopeRef: asScopeRef("cadastro:42"),
    });

    const result = await manualScheduler.run(connection.connectionId);
    expect(result.envelope?.profile).toBe("metrics-timeseries");
  });

  it("RetryExecutor respeita maxAttempts sem backoff", async () => {
    const executor = new RetryExecutor();
    const policy = new SimpleRetryPolicy(2);
    let calls = 0;

    await expect(
      executor.run(async () => {
        calls += 1;
        throw new Error("fail");
      }, policy),
    ).rejects.toThrow("fail");

    expect(calls).toBe(2);
  });

  it("RuntimeRepository conta falhas consecutivas", async () => {
    const repo = new InMemoryRuntimeRepository();
    const metrics = new InMemoryRuntimeMetrics();
    const base = createRuntimeStack();
    const orchestrator = new SyncOrchestrator(
      base.connectionService,
      base.identityService,
      base.resolver,
      async () => createAlwaysFailingProvider(),
    );
    const runtime = new SyncRuntime(
      base.connectionService,
      orchestrator,
      base.healthEngine,
      repo,
      new RetryExecutor(),
      new SimpleRetryPolicy(1),
      metrics,
    );

    const connection = await base.connectionService.create({
      pluginKey: "example",
      label: "Consecutive",
      scopeRef: asScopeRef("cadastro:42"),
    });

    await runtime.execute(connection.connectionId);
    await runtime.execute(connection.connectionId);
    await runtime.execute(connection.connectionId);

    expect(await repo.countConsecutiveFailures(connection.connectionId)).toBe(3);
  });
});
