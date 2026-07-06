---
title: ADR-0019 — OS Core Layer (Fase 4)
status: accepted
date: 2026-07-06
---

# ADR-0019: OS Core Layer

## Contexto

As Fases 1–3 do Agency OS entregaram funcionalidade operacional com inteligência.
O crescimento futuro (Financeiro, CRM, BI, Automações) exige infraestrutura compartilhada
sem acoplamento entre módulos.

## Decisão

Introduzir `src/modules/core/` como **Operating System** do Lots BI:

1. **Event Bus** in-process tipado (preparado para workers)
2. **Command Bus** com validação Zod, auditoria e emissão de eventos
3. **Config Registry** para rotas, widgets, search, permissions, flags
4. **Dashboard Engine** e **Search Engine** baseados em registro
5. Módulos registram-se via `os-bootstrap.ts`

Mutations do Agency OS passam pelo command bus sem alterar assinaturas públicas.

## Consequências

### Positivas

- Novos domínios integram-se por registro, não por edição do core
- Redução de acoplamento direto entre módulos
- Auditoria centralizada
- RBAC e feature flags preparados

### Negativas / trade-offs

- Event bus in-process não sobrevive a restart (workers futuros usarão `serialize()`)
- Overhead mínimo de indireção nos commands (aceitável)

## Alternativas consideradas

- **Microserviços imediatos** — rejeitado; complexidade prematura
- **Manter calls diretos** — rejeitado; não escala para N módulos

## Status

Aceito — Fase 4 Agency OS / Lots BI OS Core.
