# metric-pipeline

**Responsabilidade:** handler do perfil `metrics-timeseries` — normalização e escrita via `MetricWriterPort`.

**Writers (Passive Production):**

| Writer         | writerKey                | Ambiente                                        |
| -------------- | ------------------------ | ----------------------------------------------- |
| MemoryWriter   | `base_metricas_memory`   | dev/testes (default)                            |
| SupabaseWriter | `base_metricas_supabase` | prod (flag `PLATFORM_HUB_SUPABASE_WRITER=true`) |

**Fluxo dual-run:** Runtime → Pipeline → MemoryWriter + SupabaseWriter → base_metricas

**SupabaseWriter** vive em `platform-hub-bridges/base-metricas/` (fora do kernel).
