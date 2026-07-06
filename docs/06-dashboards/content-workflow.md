---
title: Content Workflow — Dashboards & Biblioteca
description: Dashboard operacional, biblioteca de conteúdos e métricas do workflow.
status: living
owner: Engenharia / Produto Lotus
last_review: 2026-07-05
---

# Content Workflow — Dashboards & Biblioteca

---

## Dashboard operacional (`/admin/aprovacoes/dashboard`)

Visão para **gestor da agência**. Uma fonte de dados — cards + events.

### KPIs principais

| Métrica | Fonte | Descrição |
| ------- | ----- | --------- |
| Por status | `posts_editorial` GROUP BY status | Produção, Edição, Aguardando, Aprovado, Publicado |
| Por cliente | JOIN `cadastro_clientes` | Volume por conta |
| Por social media | `responsavel_user_id` | Carga por responsável |
| Tempo médio por etapa | `compute-stage-durations(events)` | Ex.: média Produção→Edição |
| Conteúdos atrasados | `data_publicacao < today` AND status ativo | Alerta operacional |
| Publicações da semana | `published_at` na semana corrente | |
| Aguardando aprovação | `status = aguardando_aprovacao` | Count + lista rápida |

### Implementação

- Server fn: `getApprovalOpsDashboard` em `dashboard/dashboard.server.ts`
- Pure fn: `compute-stage-durations.ts` + `build-ops-dashboard.ts` (Vitest)
- View SQL: `vw_content_workflow_ops_status` (migration 21)
- Rota: `/admin/aprovacoes/dashboard`

---

## Biblioteca

**Repositório oficial** de conteúdos publicados da agência.

### Regras

- Entrada automática ao marcar `publicado` (`published_at` set)
- Arquivar (`archived_at`) — permanece na Biblioteca com filtro
- **Hard delete proibido** para publicado/arquivado
- Histórico de events preservado indefinidamente

### Filtros v1

- Plataforma (Instagram, TikTok, Facebook, LinkedIn…)
- Cliente
- Responsável
- Período (data publicação)

### Futuro (Roadmap)

- Alimentar **IA** (treino / few-shot por cliente)
- **Relatórios** de performance criativa
- **Pesquisa** full-text
- **Cases** e **portfólio** comercial

---

## Portal cliente (`/aprovacoes`)

Tabs: Kanban (read-only) | Pilares | Stories | Biblioteca

- Aprovar / reprovar / comentar nos cards em `aguardando_aprovacao`
- Preview social idêntico ao admin

---

## Deprecação

| Antigo | Novo |
| ------ | ---- |
| Calendário Editorial (nome módulo) | Content Workflow / Aprovações |
| `/admin/editorial` | `/admin/aprovacoes` (+ redirect) |
| Lista `/aprovacoes` only | Portal completo com tabs |

---

## Referências

- [Admin modules](./admin-modules.md) — mapa geral
- [ADR-0018](../02-architecture/adr/0018-content-workflow-module-v1.md)
