---
title: ADR-0023 — Estrutura do módulo sem runtime (Fase 2)
status: Aceito
date: 2026-07-07
---

# ADR-0023 — Estrutura do módulo sem runtime (Fase 2)

## Contexto

Fase 2 monta o esqueleto compilável: connections, metric-pipeline, bridge legado — sem
executar sync nem alterar Make/base_metricas.

## Decisão

1. `ConnectionResolver` implementa `ConnectionResolverPort` — único ponto que conhece ScopeRef.
2. `platform-hub-bridges/legacy-cadastro/` é módulo separado; bridge temporário.
3. `MetricPipeline` implementa `MetricPipelinePort`; `BaseMetricasWriter` implementa `MetricWriterPort`.
4. `register-with-core.ts` registra pillar no Core OS — sem workers.
5. Nenhuma migration `ph_*` nesta fase (DB é Fase 4).

## Consequências

- Código compila e ports têm implementação mínima ou stub que falha explicitamente se chamado.
- Fluxo Make → base_metricas permanece produção.
- Sync Runtime (Fase 6) pluga em ports já definidos.
