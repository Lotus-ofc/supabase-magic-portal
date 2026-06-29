---
title: Knowledge Center — Módulo nativo
description: Arquitetura do Centro de Conhecimento integrado ao painel admin do Lots BI.
status: living
owner: Engenharia Lots BI
tags: [knowledge-center, admin, documentation]
difficulty: intermediate
last_review: 2026-06-26
---

# Knowledge Center

Módulo administrativo que renderiza `docs/**/*.md` como experiência de leitura estilo GitBook/Stripe Docs.

## Princípios

1. **Markdown é a fonte única** — arquivos em `docs/`; sem duplicação no banco.
2. **Auto-discovery** — `import.meta.glob` indexa novos `.md` no build.
3. **Modular** — parser, registry, navegação, busca e UI desacoplados em `src/lib/knowledge-center/`.
4. **Admin only** — rota `/admin/knowledge`, guard em `admin/route.tsx`.

## Estrutura de código

```
src/lib/knowledge-center/
  parse.ts          # frontmatter parser (browser-safe) + TOC
  registry.ts       # glob docs/**/*.md
  navigation.ts     # árvore colapsável
  search.ts         # Fuse.js
  storage.ts        # favoritos e recentes (localStorage)
  link-resolver.ts  # links .md → rotas internas

src/components/knowledge-center/
  KnowledgeLayout, KnowledgeSidebar, DocViewer, …

src/routes/_authenticated/admin/knowledge/
  route.tsx, index.tsx, $.tsx (splat)
```

## Recursos

- Navegação por categorias (pastas `00-company`, …)
- Busca instantânea (⌘K)
- Breadcrumb, TOC automático, favoritos, recentes
- Mermaid renderizado (não só código)
- Metadados YAML: title, description, status, tags, difficulty

## Futuro (arquitetura preparada)

- Edição online, comentários, versionamento
- Busca semântica / IA
- Diff entre versões, docs por cliente, docs públicas

## Manutenção

Ao adicionar documentação: crie `.md` em `docs/` com frontmatter. Não é necessário registrar manualmente no app.
