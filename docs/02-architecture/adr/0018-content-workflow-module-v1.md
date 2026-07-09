---
title: ADR-0018 — Content Workflow Module v1 (Aprovações)
status: Aceito
date: 2026-07-05
amended: 2026-07-06
---

# ADR-0018 — Content Workflow Module v1 (Aprovações)

## Contexto

A Lots BI possuía um MVP de **Calendário Editorial** (`posts_editorial`, `/admin/editorial`,
`/aprovacoes`) focado em calendário mensal e lista de aprovações pendentes. Esse escopo é
insuficiente para a visão de longo prazo da plataforma.

O produto precisa de um **módulo definitivo de Workflow de Conteúdo** — responsável por todo o
fluxo de produção de conteúdo da agência: planejamento, produção, edição, aprovação do cliente,
publicação, biblioteca e (futuro) métricas pós-publicação e automações.

**Nome visível ao usuário:** Aprovações  
**Nome técnico do módulo:** `approval` (`src/modules/approval/`)  
**Nome de domínio / documentação:** Content Workflow (Workflow de Conteúdo)  
**Aggregate root oficial:** `ContentCard` → tabela **`content_cards`**

O Kanban é **uma visualização** entre várias (Calendário, Pilares, Stories, Biblioteca,
Dashboard operacional). Todas orbitam o mesmo aggregate root.

Precedentes arquiteturais:

- [ADR-0014](./0014-auth-module-v3-architecture.md) — boundaries, repository layer, validação CI
- [ADR-0013](./0013-plano-estrategico-centro-estrategico.md) — schema aditivo, motores puros, RLS colaborativa

## Decisão

### 1. Domínio oficial: `content_cards`

A tabela **`content_cards`** é o aggregate root persistente do módulo.

| Tabela                     | Papel                                                                          |
| -------------------------- | ------------------------------------------------------------------------------ |
| **`content_cards`**        | Domínio oficial — aggregate root                                               |
| `content_card_events`      | Timeline append-only (event sourcing lite)                                     |
| `content_card_attachments` | Mídias e anexos do card                                                        |
| `editorial_pillars`        | Pilares editoriais por cliente                                                 |
| `story_plan_rows`          | Plano de stories (planilha)                                                    |
| `posts_editorial`          | **Legado** — fonte de backfill; código MVP ainda referencia até Fase 1         |
| `post_media`               | **Legado** — backfill → `content_card_attachments`                             |
| `post_revisions`           | **Legado** — backfill → `content_card_events`; escrita descontinuada na Fase 1 |

Nada existe desacoplado do Card:

| Filho / extensão     | Tabela / mecanismo                                                  |
| -------------------- | ------------------------------------------------------------------- |
| Events / Timeline    | `content_card_events`                                               |
| Attachments          | `content_card_attachments`                                          |
| Checklist            | `content_cards.checklist` (JSONB)                                   |
| Editorial Pillar     | FK `pilar_id` → `editorial_pillars`                                 |
| Story Plan           | `story_plan_rows.card_id` (opcional)                                |
| AI Metadata          | `content_cards.ai_metadata`                                         |
| Integration Metadata | `content_cards.integration_metadata`                                |
| Biblioteca           | submódulo `library/` — query sobre cards `publicado` \| `arquivado` |

### 2. Fluxo de camadas obrigatório

Nenhum submódulo acessa Supabase diretamente fora da camada Repository.

```
UI (rotas finas)
  ↓
Server Function (createServerFn + requireSupabaseAuth)
  ↓
Module Service (regras de negócio puras ou orquestração)
  ↓
Repository (*.repository.server.ts)
  ↓
Supabase (RLS)
```

Cada subdomínio em `src/modules/approval/` possui:

| Camada                 | Arquivo(s)                                         |
| ---------------------- | -------------------------------------------------- |
| `types.ts`             | Contratos do subdomínio                            |
| `validation.ts`        | Schemas Zod                                        |
| `services/`            | Lógica pura (sem Supabase)                         |
| `repository.server.ts` | **Único** ponto de acesso Postgres do subdomínio   |
| `*.server.ts`          | Server functions (orquestram service + repository) |
| `index.ts`             | Barrel público                                     |

### 3. Event sourcing lite — `content_card_events`

Timeline **append-only**. Proibido UPDATE e DELETE (enforced por trigger Postgres).

Tipos de evento:

```
created | updated | commented | moved | approval_requested |
approved | rejected | published | archived |
attachment_added | attachment_removed | checklist_changed
```

Toda ação relevante gera um evento. A Timeline do Card é projeção cronológica desta tabela.

Exemplo:

> João criou o Card.  
> Maria alterou a legenda.  
> Cliente comentou.  
> Cliente aprovou.  
> Social Media publicou.

### 4. Biblioteca — módulo próprio

A Biblioteca **não é um filtro SQL solto**. É o submódulo `library/` com:

- Entrada automática em `publicado` (`published_at`)
- Arquivamento via `arquivado` (`archived_at`) — **nunca hard delete**
- Trigger `tg_content_cards_prevent_hard_delete` bloqueia DELETE em publicado/arquivado
- Futuro: IA, relatórios, pesquisa, cases, portfólio

### 5. Visualizações — uma fonte (`content_cards`)

| Visualização     | Submódulo              | Projeção                           |
| ---------------- | ---------------------- | ---------------------------------- |
| Kanban (default) | `cards/` + `workflow/` | por `status` + `kanban_ordem`      |
| Calendário       | `calendar/`            | por `data_publicacao`              |
| Pilares          | `pillars/`             | `editorial_pillars`                |
| Stories          | `stories/`             | `story_plan_rows`                  |
| Biblioteca       | `library/`             | `status IN (publicado, arquivado)` |
| Dashboard ops    | `dashboard/`           | agregações cards + events          |

### 6. Status do workflow (`content_card_status`)

| Coluna Kanban        | Status DB              | Cor token |
| -------------------- | ---------------------- | --------- |
| Produção             | `producao`             | vermelho  |
| Edição               | `edicao`               | amarelo   |
| Aguardando Aprovação | `aguardando_aprovacao` | azul      |
| Aprovado             | `aprovado`             | verde     |
| Publicado            | `publicado`            | cinza     |
| Biblioteca           | `arquivado`            | neutro    |

Backfill legado: `post_status.rascunho` / `em_producao` → `producao`.

### 7. Estrutura do módulo

```
src/modules/approval/
├── index.ts
├── types.ts
├── permissions/          # matrix + resolve-card-action
├── workflow/             # status-machine, column-config
├── cards/
│   ├── types.ts
│   ├── validation.ts
│   ├── services/
│   ├── repository.server.ts
│   └── cards.server.ts
├── events/
├── comments/             # → events.commented
├── attachments/
├── pillars/
├── stories/
├── calendar/
├── library/              # módulo Biblioteca (não filtro)
├── dashboard/
├── integrations/
│   ├── ports.ts            # ContentPublisherPort, WorkflowAutomationPort
│   └── ai-ports.ts         # ContentAiPort
└── services/               # cross-cutting: build-kanban-board, build-card-timeline, compute-stage-durations
```

Boundary validation: `scripts/validate-approval-boundaries.mjs` no `npm run check`.

### 8. Separação de responsabilidades

| Persona          | Pode                                   | Não pode                       |
| ---------------- | -------------------------------------- | ------------------------------ |
| **Admin**        | CRUD completo, mover, arquivar         | —                              |
| **Social Media** | CRUD + mover no escopo                 | aprovar, arquivar, hard delete |
| **Cliente**      | visualizar, comentar, aprovar/reprovar | editar estrutura, mover        |

### 9. Ports futuros (sem implementação na Fase 0–1)

**ContentAiPort:**

- `generateCaption()`, `generateCopy()`, `generateHashtags()`
- `evaluateCreative()`, `suggestBestTime()`, `improveCTA()`

**ContentPublisherPort** — Meta, TikTok, LinkedIn  
**WorkflowAutomationPort** — Make, n8n

### 10. Dashboard operacional

Métricas sobre `content_cards` + `content_card_events`:

- Quantidade por cliente / social media / status
- Tempo médio por etapa (`compute-stage-durations`)
- Conteúdos atrasados
- Publicações da semana
- Aguardando aprovação

### 11. Nomenclatura

| Contexto           | Termo                                             |
| ------------------ | ------------------------------------------------- |
| UI                 | **Aprovações**                                    |
| Domínio / docs     | **Content Workflow**                              |
| Código             | `approval`, `ContentCard`, `content_cards`        |
| Legado (transição) | `posts_editorial`, `post_media`, `post_revisions` |
| Deprecado          | Calendário Editorial como nome de módulo          |

## Alternativas consideradas

- **Evoluir `posts_editorial` in-place (sem `content_cards`):** rejeitado na v2 — nome legado
  contamina domínio; dificulta boundaries e evolução por anos.
- **Biblioteca como filtro:** rejeitado — é repositório estratégico com módulo próprio.
- **Supabase direto nos services:** rejeitado — viola repository pattern e testabilidade.
- **Timeline via `post_revisions`:** rejeitado — enum limitado, sem payload para IA.

## Consequências

### Positivas

- Domínio limpo (`content_cards`) preparado para anos de evolução.
- Repository pattern testável; boundaries enforceable no CI.
- Event sourcing lite para auditoria e IA.
- Biblioteca como asset permanente da agência.

### Negativas / dívidas

- Coexistência dual `posts_editorial` + `content_cards` até Fase 1 migrar código legado.
- Backfill one-time na migration 18; cards novos só em `content_cards`.
- Role `social_media` na migration 19 (Fase 1).

## Evoluções futuras (Roadmap)

Meta Graph · TikTok · LinkedIn · OpenAI · Claude · Make · n8n · agendamento automático ·
métricas pós-publicação · descontinuar tabelas legado

## Referências

- [Content Workflow — Arquitetura](../content-workflow.md)
- [Plano Fase 0](../../03-backend/content-workflow-phase-0.md)
- [Schema](../../04-database/content-workflow-schema.md)
