---
title: ADR-0022 — Implementação Hub Registry (Fase 1)
status: Aceito
date: 2026-07-07
---

# ADR-0022 — Implementação Hub Registry (Fase 1)

## Contexto

Fase 1 entrega o container de plugins. O registry é o ponto de entrada para capability
routing — sem ele, Sync Runtime e Publisher não têm como resolver plugins.

## Decisão

1. `HubRegistry` implementa `HubRegistryPort` em `registry/hub-registry.ts`.
2. `GlobPluginLoader` implementa `PluginLoaderPort` — `import.meta.glob` em `plugins/**/*.register.ts`.
3. Registro: manifest + adapter (provider acessado só via adapter).
4. Fonte de metadata para AI Workspace continua `registry-report.json` (build), não introspection.
5. Runtime Registry **não** é implementado nesta fase.

## Consequências

- Plugins marketing (stubs) registram capabilities namespaced.
- Nenhum OAuth, provider real ou sync nesta fase.
- Doctor e validators da Fase -1 continuam válidos.
