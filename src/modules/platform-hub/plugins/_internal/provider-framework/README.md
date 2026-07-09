# Provider framework (interno)

**Responsabilidade:** `ProviderPort.collect()` e montagem de `IngestEnvelope` sem acoplamento ao legado.

**Implementa:** `createFakeMetricsProvider`, `collectIngestEnvelope` — Fase 3.

**Dependentes:** `plugins/*/providers/` — não exportar em `public/`.
