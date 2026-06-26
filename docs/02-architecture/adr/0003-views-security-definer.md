---
title: ADR-0003 — Views analíticas como SECURITY DEFINER
status: Aceito (com dívida)
date: 2026-06-26
---

# ADR-0003 — Views analíticas como SECURITY DEFINER

## Contexto

As views analíticas foram inicialmente criadas com `security_invoker = on`
(`02_views_metricas.sql`). Isso faz a leitura de `base_metricas` rodar com as permissões do
usuário autenticado. Como `base_metricas` tem **RLS habilitada e nenhuma policy** que conceda
`SELECT` ao papel `authenticated`, a leitura retornava **0 linhas — inclusive para admin**.
Resultado: todos os dashboards apareciam vazios.

Comprovado via REST API (documentado em `07_views_fix_security_invoker.sql`):

- `GET /rest/v1/base_metricas?select=count` (JWT admin) → `*/0`
- `POST /rest/v1/rpc/current_user_clientes` (JWT admin) → 6 clientes
- `GET /rest/v1/vw_overview_cliente` (JWT admin) → `[]`

## Decisão

Recriar as views como **`SECURITY DEFINER`** (padrão do Postgres, sem `security_invoker`).
A view passa a ler `base_metricas` com as permissões do owner, contornando a RLS da tabela
legada. A **isolação por cliente permanece** porque `vw_metricas_normalizadas` filtra por
`current_user_clientes()`, que é `SECURITY DEFINER` e lê `auth.uid()` do JWT do chamador.

## Alternativas consideradas

- **Adicionar policy de SELECT correta em `base_metricas`** e voltar a `security_invoker`:
  solução mais "correta", mas mexe na tabela legada e exige policy multi-tenant performática.
- **Roteamento de toda leitura por server functions:** mais defesa em profundidade, porém
  reescreve a camada de leitura dos dashboards.

## Consequências

### Positivas

- Dashboards voltam a funcionar para admin e cliente, sem alterar a tabela legada.
- Isolação multi-tenant centralizada em `current_user_clientes()`.

### Negativas / dívidas

- Toda a segurança de leitura analítica depende do `WHERE current_user_clientes()` nas
  views. Um erro futuro nessa função/view pode vazar dados entre clientes.
- Menor defesa em profundidade. Reavaliar para `security_invoker` + policy adequada é item de
  [Roadmap](../../11-roadmap/roadmap.md).
