---
title: ADR-0021 — Platform Hub ports (Fase 0)
status: Aceito
date: 2026-07-07
---

# ADR-0021 — Platform Hub ports (Fase 0)

## Contexto

Fase -2 definiu contratos em `contracts/`. Fase -1 entregou governança e example plugin.
Fase 0 deve traduzir contratos em interfaces TypeScript no módulo `platform-hub/` sem
implementação, para que o código passe a documentar o fluxo do Hub.

## Decisão

1. Ports definitivas vivem em `src/modules/platform-hub/ports/`.
2. Cada port referencia tipos de `contracts/` — não duplica schemas.
3. Apenas ports com consumidor previsto até **Fase 2** são criadas agora.
4. Ports de Sync Runtime, Health e Runtime Registry ficam adiadas (ver `ports/README.md`).
5. API pública (`public/index.ts`) exporta somente tipos — zero implementação.

## Consequências

- Desenvolvedores leem `platform-hub/README.md` e `ports/README.md` em vez do doc de arquitetura.
- Fase 1 implementa `HubRegistryPort` e `PluginLoaderPort` sem redesenho.
- Fase 2 implementa `ConnectionResolverPort`, `MetricPipelinePort`, `MetricWriterPort`.
- Ports adiadas exigem ADR antes de serem adicionadas fora da fase prevista.
