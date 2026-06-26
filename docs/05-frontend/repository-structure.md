---
title: Estrutura do Repositório
description: Organização de pastas, convenções de nomes e mapa de módulos do código.
status: living
owner: Engenharia Lotus
last_review: 2026-06-26
---

# Estrutura do Repositório

Raiz do app: `supabase-magic-portal/`

---

## Árvore principal

```
supabase-magic-portal/
├── .cursor/rules/          # Regras Cursor (engenharia + docs)
├── docs/                   # Engineering Handbook (este centro de conhecimento)
├── public/                 # Assets estáticos
├── src/
│   ├── routes/             # TanStack Router (file-based)
│   ├── components/
│   │   ├── lotus/          # Componentes de domínio Lotus
│   │   └── ui/             # Primitivos shadcn/Radix
│   ├── lib/                # Lógica de negócio pura
│   │   └── platforms/      # Engine declarativo de plataformas
│   ├── integrations/       # Clientes Supabase + auth middleware
│   ├── hooks/              # Hooks React reutilizáveis
│   ├── router.tsx          # createRouter + QueryClient
│   ├── start.ts            # Middlewares globais TanStack Start
│   └── server.ts           # Entry SSR + tratamento de erros
├── supabase/
│   └── migrations-official/  # DDL versionado (01–08)
├── .env.example            # Template de variáveis
├── AGENTS.md               # Avisos Lovable + fluxo Lotus
├── package.json
└── vite.config.ts          # Preset Lovable (transitório)
```

---

## `src/routes/` — roteamento

Convenção TanStack Start: arquivo = rota.

| Padrão | Exemplo | Significado |
|--------|---------|-------------|
| `index.tsx` | `/` | Raiz |
| `auth.tsx` | `/auth` | Rota plana |
| `_authenticated/route.tsx` | Layout | Guard + shell |
| `cliente.$cliente.tsx` | `/cliente/:cliente` | Parâmetro dinâmico |
| `admin/clientes.$id.tsx` | `/admin/clientes/:id` | Aninhado |

`routeTree.gen.ts` é **gerado** — nunca editar manualmente.

Detalhes: [Roteamento](./routing.md)

---

## `src/lib/` — lógica de negócio

| Módulo | Responsabilidade |
|--------|------------------|
| `platforms/*` | Engine declarativo, fórmulas, PlatformDefs |
| `metrics.ts` | Agregação overview cross-platform |
| `period.ts` | Datas BRT, presets de período |
| `admin.functions.ts` | Server functions administrativas |
| `editorial.functions.ts` | Server functions editorial |
| `integrations-catalog.ts` | Catálogo de integrações (formulário admin) |
| `error-capture.ts` | Recuperação de erros SSR (h3) |
| `error-page.ts` | HTML de erro 500 |
| `lovable-error-reporting.ts` | Report client → Lovable (transitório) |
| `utils.ts` | `cn()` — merge de classes Tailwind |

**Regra:** componentes React **não** contêm cálculos de KPI.

---

## `src/components/lotus/` — UI de domínio

Componentes reutilizáveis do produto: `PlatformDashboard`, `AppShell`, `StatCard`,
`PeriodToggle`, charts, etc.

Catálogo: [Design System](./component-system.md)

---

## `src/integrations/supabase/`

| Arquivo | Uso |
|---------|-----|
| `client.ts` | Browser — anon key + JWT |
| `client.server.ts` | Servidor — service-role |
| `auth-middleware.ts` | `requireSupabaseAuth` |
| `auth-attacher.ts` | `attachSupabaseAuth` |

---

## `supabase/migrations-official/`

Migrations numeradas, aditivas, idempotentes. Ordem:

| # | Arquivo | Tema |
|---|---------|------|
| 01 | `auth_roles_access.sql` | Auth, roles, `current_user_clientes` |
| 02 | `views_metricas.sql` | Views analíticas iniciais |
| 03 | `cadastro_clientes_extensao.sql` | Clientes, serviços, RLS |
| 05 | `cadastro_clientes_make_ids.sql` | IDs técnicos Make |
| 06 | `editorial.sql` | Posts, revisões |
| 07 | `views_fix_security_invoker.sql` | SECURITY DEFINER |
| 08 | `aliases_e_null_guard.sql` | Aliases + NULL guard |

> Não existe migration `04` (deprecada).

---

## Alias de import

`@/` → `src/` (tsconfig + Vite).

---

## O que NÃO está no repositório

| Item | Status |
|------|--------|
| Cenários Make | Externo |
| CI/CD (`.github/workflows`) | Não implementado |
| Testes (`*.test.ts`) | Não implementado |
| `supabase/config.toml` | Não presente |
| Schema DDL `base_metricas` | Não versionado |

---

## Referências

- [Organização de código](../09-standards/code-organization.md)
- [Engine de métricas](../06-engine/overview.md)
- [Arquitetura — estado atual](../02-architecture/current-state.md)
