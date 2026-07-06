---
title: AI Workspace
description: Context Pack automático para IAs — agregação e síntese do repositório, exclusivo para Platform Owner.
status: living
owner: Engenharia Lotus
last_review: 2026-07-06
---

# AI Workspace

Módulo exclusivo do **Platform Owner** em `/admin/ai-workspace`. Fornece um **Context Pack**
automaticamente derivado do repositório — o bootloader de IA do Lots BI.

## Diferença vs Knowledge Center

| | Knowledge Center | AI Workspace |
|---|---|---|
| Audiência | Humanos (engenheiros) | IAs + onboarding rápido |
| Conteúdo | Documentos completos | Síntese agregada |
| Manutenção | Docs escritos por humanos | Zero escrita manual |
| Output | Navegação por árvore | Prompt copiável |

O Knowledge Center permanece a **única fonte de verdade** para documentação. O AI Workspace
**consome** essas fontes via `src/lib/knowledge-center/registry.ts` sem duplicá-las.

## Arquitetura

```mermaid
flowchart LR
    subgraph sources [Fontes]
        KC[docs/**/*.md]
        Code[src/modules]
        SQL[migrations-official]
        Pkg[package.json]
        Git[git-snapshot.json]
    end

    subgraph lib [src/lib/ai-workspace/]
        Snap[snapshot.ts]
        Prompt[prompt-generator.ts]
        Score[context-score.ts]
    end

    subgraph ui [/admin/ai-workspace]
        Page[AiWorkspacePage]
    end

    sources --> Snap
    Snap --> Prompt
    Snap --> Score
    Prompt --> Page
```

### Estrutura de arquivos

```
src/lib/ai-workspace/
├── types.ts
├── snapshot.ts              # orquestrador
├── prompt-generator.ts      # Context Pack markdown
├── context-score.ts
├── export.ts
├── search.ts
├── queries.ts
├── sources/                 # um aggregator por bloco
├── extractors/              # parsers puros (testáveis)
└── generated/git-snapshot.json  # build-time

src/components/ai-workspace/
└── AiWorkspacePage.tsx      # UI

src/routes/_authenticated/admin/ai-workspace.tsx  # guard owner-only
```

## Fontes automáticas por bloco

| Bloco | Fontes |
|-------|--------|
| Visão Geral | `START_HERE`, `00-company/mission`, `01-product/product-overview` |
| Arquitetura | `02-architecture/overview`, `current-state` |
| Módulos | glob `src/modules/**`, `configRegistry` |
| Fluxos | `auth-module-v3`, `content-workflow`, `data-flow` |
| Banco | migrations SQL + `04-database/schema.md` |
| ADRs | `docs/02-architecture/adr/*.md` |
| Roadmap | `11-roadmap/roadmap.md` |
| Changelog | `12-changelog/changelog.md` + git snapshot |
| Convenções | `09-standards/*`, `.cursor/rules/*.mdc`, boundary scripts |

## Prompt Generator

Botão **"Gerar Contexto para IA"** compõe markdown com:

- Resumo executivo, stack, arquitetura
- Módulos, fluxos, banco, ADRs
- Roadmap (Concluído / Em andamento / Planejado)
- Changelog, convenções, limitações
- Objetivo atual, últimas implementações, próximos passos

Pronto para colar em ChatGPT, Cursor, Claude ou Gemini.

## Context Score

**AI Context Completeness** — percentual calculado sobre 8 critérios:

Arquitetura, ADRs, Roadmap, Changelog, Banco, Fluxos, Módulos, Documentação.

## Git Snapshot

Script `scripts/generate-ai-workspace-snapshot.mjs` roda em `prebuild` e gera
`src/lib/ai-workspace/generated/git-snapshot.json` com commits recentes e contagens.

## Permissões

Apenas `isPlatformOwnerEmail()`. Sem role, migration ou RLS adicional.

## AI Insights (v2+)

Placeholders com contratos TypeScript (`AiInsightScanner`) para scanners futuros:
TODO, Technical Debt, Complexity, Circular Dependencies, etc.

## Evolução

- **v2:** scanners reais plugados em `sources/insights.ts`
- **v3:** prompts contextualizados por tipo de tarefa (bug, feature, auditoria)
- **Longo prazo:** memória viva da plataforma com CI webhook
