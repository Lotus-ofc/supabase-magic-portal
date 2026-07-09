# runtime

**Responsabilidade:** motor de execução genérico de sincronizações — Fase 6 congelada.

**Fluxo:**

```
ManualScheduler.run(connectionId)
  → SyncRuntime.execute(connectionId)
  → ConnectionService → Provider.collect()
  → IngestEnvelope → ExecutionResult
  → HealthEngine.accept(...)  (contrato Fase 5)
```

**Implementa:** `SyncRuntime`, `SyncOrchestrator`, `RetryExecutor`, `ManualScheduler`, repositório e métricas in-memory.

**Não conhece:** plataforma, OAuth, HTTP, banco, pipeline, dashboard.

**Factory:** `createRuntimeStack()` — compõe connection stack + health stack + runtime.
