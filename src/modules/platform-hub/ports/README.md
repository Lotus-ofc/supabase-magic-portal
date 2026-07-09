# Platform Hub — Ports

Interfaces definitivas do Hub. Cada port traduz um contrato de `contracts/` para o runtime.

Ports centrais (Fase 0). Implementações vivem nos submódulos correspondentes.

## Mapa port → submódulo

| Port                       | Submódulo            | Implementação           | Fase  |
| -------------------------- | -------------------- | ----------------------- | ----- |
| `PluginAdapterPort`        | `plugins/`           | cada `*.adapter.ts`     | F3    |
| `ProviderPort`             | `plugins/providers/` | providers reais         | F3    |
| `PluginLoaderPort`         | `registry/`          | `GlobPluginLoader`      | F1 ✅ |
| `HubRegistryPort`          | `registry/`          | `HubRegistry`           | F1 ✅ |
| `ConnectionResolverPort`   | `connections/`       | `ConnectionResolver`    | F3    |
| `MetricPipelinePort`       | `metric-pipeline/`   | `MetricPipeline`        | F6    |
| `MetricWriterPort`         | `metric-pipeline/`   | `BaseMetricasWriter`    | F6    |
| `SyncRuntimePort`          | `runtime/`           | `SyncRuntime`           | F6    |
| `HealthReconciliationPort` | `health/`            | reconciler              | F5    |
| `LegacyCadastroBridgePort` | `bridges/`           | `platform-hub-bridges/` | F3    |

## Adiados (sem port nesta pasta)

| Contrato                   | Motivo                          | Primeiro uso |
| -------------------------- | ------------------------------- | ------------ |
| `SyncRuntimePort`          | Sem consumidor em F1–F2         | Fase 6       |
| `HealthReconciliationPort` | Health Engine não existe ainda  | Fase 5       |
| `IntegrationEvent*` (emit) | Event Bus integration posterior | Fase 6       |
| `RuntimeRegistry`          | Spec ADR B; impl adiada         | Fase 6+      |

Se precisar de uma port adiada antes da fase prevista, abra ADR antes de implementar.
