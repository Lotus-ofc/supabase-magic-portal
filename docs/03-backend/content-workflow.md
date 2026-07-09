---
title: Content Workflow — Backend
description: Server functions, repository pattern e API do módulo Aprovações.
status: living
owner: Engenharia Lotus
last_review: 2026-07-06
---

# Content Workflow — Backend

Módulo: `src/modules/approval/`  
**Status:** Content Workflow v3 concluído (Fase 5). Sem código legado editorial.

**Fase 1 entregue:** Kanban admin em `/admin/aprovacoes`.

**Fase 2 entregue:** Portal cliente em `/aprovacoes` via `client-cards.server.ts`.

**Fase 5.1 entregue:** Integração contextual em `/cliente/:slug/aprovacoes` via
`modules/client/` (`ClientScopeProvider` + `scoped-portal.functions.ts`). O módulo Approval permanece
inalterado; a adaptação resolve `ClientAccessScope` e delega aos services existentes.

---

## Fluxo obrigatório

```
UI → Server Function → Module Service → Repository → Supabase
```

**Regra:** nenhum arquivo em `modules/approval/` importa `@/integrations/supabase` exceto
`*.repository.server.ts`.

---

## Subdomínios

| Submódulo       | Responsabilidade            | Repository                         |
| --------------- | --------------------------- | ---------------------------------- |
| `cards/`        | CRUD, move, lifecycle       | `cards/repository.server.ts`       |
| `events/`       | Timeline append-only        | `events/repository.server.ts`      |
| `comments/`     | Wrapper → event `commented` | via `events/`                      |
| `attachments/`  | Upload, list, delete        | `attachments/repository.server.ts` |
| `pillars/`      | CRUD pilares                | `pillars/repository.server.ts`     |
| `stories/`      | CRUD planilha               | `stories/repository.server.ts`     |
| `calendar/`     | Projeção mensal             | `calendar/repository.server.ts`    |
| `library/`      | Repositório publicados      | `library/repository.server.ts`     |
| `dashboard/`    | Agregações ops              | `dashboard/repository.server.ts`   |
| `workflow/`     | Status machine (puro)       | —                                  |
| `permissions/`  | Matriz + resolve (puro)     | —                                  |
| `integrations/` | Ports (stubs)               | —                                  |

---

## Eventos automáticos

Toda mutação relevante chama `events/repository.append()`:

| Ação             | `event_type`         |
| ---------------- | -------------------- |
| Criar card       | `created`            |
| Editar campos    | `updated`            |
| Mover Kanban     | `moved`              |
| Comentar         | `commented`          |
| Enviar aprovação | `approval_requested` |
| Aprovar          | `approved`           |
| Reprovar         | `rejected`           |
| Publicar         | `published`          |
| Arquivar         | `archived`           |

---

## Ports (Fase 0 — stubs only)

### ContentAiPort

`generateCaption` · `generateCopy` · `generateHashtags` · `evaluateCreative` ·
`suggestBestTime` · `improveCTA`

### ContentPublisherPort

Meta · TikTok · LinkedIn (futuro)

### WorkflowAutomationPort

Make · n8n (futuro)

---

## Fase 0 vs Fase 1

| Fase 0                                           | Fase 1+                      |
| ------------------------------------------------ | ---------------------------- |
| Types, validation, repositories, services, ports | Server fns wired às rotas    |
| Migration 18                                     | Migration 19 (social_media)  |
| Testes puros                                     | Kanban UI                    |
| Boundaries CI                                    | Deprecar editorial.functions |

---

## Referências

- [Fase 0 spec](./content-workflow-phase-0.md)
- [Fase 3 spec](./content-workflow-phase-3.md)
- [Fase 4 spec](./content-workflow-phase-4.md)
- [ADR-0018](../02-architecture/adr/0018-content-workflow-module-v1.md)
