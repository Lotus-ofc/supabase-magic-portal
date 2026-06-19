## Resumo

Portar o portal `Lotus-ofc/majrareacliente` (TanStack Start + Supabase, mesma stack deste projeto) e religá-lo ao seu Supabase oficial `qednvazhwsbixdtswqeg`, tratando o Supabase como **fonte única de verdade** e construindo a camada de relatórios sobre **views SQL** em cima de `base_metricas` — sem tocar nas tabelas existentes.

Fluxo oficial: **Make.com → Supabase → Views SQL → Lovable → Portal do Cliente**.

---

## Diretrizes invioláveis

- **Não alterar** `base_metricas` nem `cadastro_clientes` (sem renomear, sem mudar tipo, sem remover coluna/dado, sem recriar).
- **Migrations 100% aditivas**: só `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE VIEW`, `CREATE OR REPLACE FUNCTION`, `CREATE POLICY` com guard `IF NOT EXISTS` via `DO $$` quando necessário. Proibido `DROP`, `ALTER COLUMN TYPE`, `RENAME COLUMN`.
- Toda evolução do schema atual será feita via **novas tabelas, views ou relacionamentos**.
- Multi-tenant (`agencies`, `profiles`, `user_roles`) já na primeira leva, mesmo com 1 agência.
- mLabs / `client_reports` mantidos como **fallback temporário**; relatórios oficiais vêm de `base_metricas` + views.

---

## Etapa 1 — Conexão ao Supabase oficial

1. Habilitar integração Supabase apontando para `qednvazhwsbixdtswqeg`.
2. Configurar env: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY` + secret `SUPABASE_SERVICE_ROLE_KEY`.
3. Regenerar `src/integrations/supabase/types.ts` a partir do schema real (inclui `base_metricas` e `cadastro_clientes` como read-only).

## Etapa 2 — Inspeção (antes de qualquer migration)

Rodar `SELECT column_name, data_type FROM information_schema.columns` para:

- `base_metricas` — listar TODAS as colunas reais
- `cadastro_clientes` — listar TODAS as colunas reais
- Conferir quais das tabelas do repo (`profiles`, `user_roles`, `agencies`, `client_reports`, `editorial_posts`, `invoices`, `editorial_notes`, `push_subscriptions`, `notifications`, `report_snapshots`) já existem

Resultado vira tabela de mapeamento que apresento a você ANTES de gerar SQL e gráficos.

## Etapa 3 — Schema aditivo (novas tabelas apenas)

Migration única, idempotente, criando apenas o que falta:

- Enums: `app_role`, `report_source`, `post_status`, `post_format`, `invoice_status`
- Tabelas: `agencies`, `profiles`, `user_roles`, `client_reports`, `editorial_posts`, `editorial_notes`, `invoices`, `push_subscriptions`, `notifications`, `report_snapshots`
- Multi-tenant: cada tabela nova já nasce com `agency_id uuid references agencies(id)`; `profiles` ganha `agency_id`. Default: 1 agência seed `"MAJR"`.
- Funções: `has_role`, `is_agency_member`, `tg_set_updated_at`, `handle_new_user`
- Triggers, GRANTs, RLS policies escopadas por `auth.uid()` + `agency_id`
- Vínculo `cadastro_clientes ↔ profiles`: tabela-ponte **nova** `client_links (profile_id uuid, cadastro_cliente_id <tipo real>, primary key (...))` em vez de mexer em `cadastro_clientes`.

## Etapa 4 — Camada de Views SQL para relatórios

Views criadas sobre `base_metricas` (definição final depende da Etapa 2):

- `vw_google_ads` — impressões, cliques, investimento, CTR, CPC, conversões
- `vw_meta_ads` — alcance, impressões, cliques, leads, gasto, CPL
- `vw_instagram` — alcance, engajamento, curtidas, comentários, compartilhamentos
- `vw_ga4` — sessões, usuários, pageviews, bounce, conversões
- `vw_google_business` — visualizações, cliques, ligações, rotas
- `vw_daily_<plataforma>` — séries diárias agregadas para gráficos de linha
- `vw_client_overview` — resumo cross-platform por cliente/período

Cada view exporta colunas normalizadas (`client_id`, `date`, `platform`, `campaign`, `metric_*`) para o frontend consumir sem cálculo pesado. RLS herdada via `security_invoker = on`.

## Etapa 5 — Frontend (portar do repo)

Verbatim, com ajustes de import:

- Rotas: `__root.tsx`, `index.tsx`, `login.tsx`, `_authenticated/dashboard.tsx`, `_authenticated/admin.tsx`
- Componentes: `PortalHeader`, `PortalSidebar`, `MajrLogo`, `NotificationBell`, `PushToggle`, `MetricCard`, `ChangePasswordDialog`, `ClientCalendarView`, `ClientEditorialView`, `ClientFinanceView`, `InstagramPreview`, `ManageEditorialDialog`, `ManageInvoicesDialog`, `ManagePostsDialog`, `NewsView`, `ReportBentoView`, `SocialReportView`
- Assets MAJR + PWA (`favicon`, ícones, `manifest.json`, `sw.js`)
- Gate admin via `has_role('admin')` em `beforeLoad`

## Etapa 6 — Server functions (substituem Edge Functions do repo)

Em `src/lib/`:

- `admin.functions.ts` — criar cliente, reset de senha (service role + `requireSupabaseAuth` + checagem `admin`)
- `push.functions.ts` — Web Push (npm `web-push`, segredos `VAPID_*`)
- `metrics.functions.ts` — leitura paginada das views por cliente/plataforma/campanha/período

## Etapa 7 — Dashboard de métricas reais

Após você validar o mapeamento da Etapa 2:

- Componente `<MetricsDashboard>` por plataforma (Google Ads, Meta Ads, Instagram, GA4, Google Business)
- Filtros: cliente (admin), plataforma, campanha, período (7d / 30d / 90d / mês atual / custom)
- KPIs em cards + gráficos Recharts (linha, barra, donut) lendo das views
- Auto-refresh configurável; paginação server-side para escalar com milhões de linhas
- Plataformas futuras (TikTok, LinkedIn, Pinterest, YouTube) entram só adicionando view + entrada no enum `report_source` — frontend é genérico

## Etapa 8 — Validação

- Login admin + login cliente
- CRUD admin (clientes, editorial, faturas)
- Dashboard cliente: calendário, financeiro, notificações, push PWA
- Métricas: cada view retorna dado consistente para um cliente real
- Smoke test de performance com `EXPLAIN` nas views

---

## Detalhes técnicos

- Stack idêntica ao repo: TanStack Start v1, React 19, shadcn, Tailwind v4, Supabase JS — port é praticamente cópia.
- Edge Functions do Supabase NÃO são usadas neste template; viram `createServerFn` (regra do stack).
- `_authenticated/route.tsx` gerido pela integração protege rotas; `admin` recebe gate extra.
- Views com `security_invoker = on` para respeitar RLS por `agency_id` / `client_id`.
- Índices recomendados em `base_metricas` (se aprovado, via migration aditiva `CREATE INDEX IF NOT EXISTS` — não altera tabela).

## O que pedirei durante a execução

1. Anon key atual do Supabase oficial (a do `.env` do repo pode estar antiga).
2. `SUPABASE_SERVICE_ROLE_KEY` (secret).
3. `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (se push for go-live).
4. Email do primeiro admin para `INSERT` em `user_roles`.
5. **Aprovação do mapeamento de colunas** de `base_metricas` antes de criar as views.
6. Confirmação se posso criar **índices** em `base_metricas` (operação aditiva, mas você pediu aprovação explícita para qualquer ajuste).

## O que NÃO farei sem nova aprovação

- Qualquer `ALTER`/`DROP`/`RENAME` em `base_metricas` ou `cadastro_clientes`.
- Migrar dados existentes dessas duas tabelas.
- Publicar ou expor URLs externas.
- Remover o fluxo mLabs/`client_reports` antes do dashboard novo estar validado.

---

## Débitos técnicos registrados (2026-06-19)

### 1. Relacionamento por `cliente_nome` é TEMPORÁRIO
Hoje o join entre `client_access`, `base_metricas` e as views é feito por **string** (`cliente_nome` / `base_metricas.cliente`).

**Plano de migração futura para UUID:**
1. Criar/popular catálogo `clientes_catalogo (id uuid pk, nome text unique, ...)` a partir de `cadastro_clientes`.
2. Adicionar `base_metricas.cliente_id uuid` (aditivo) e backfill via `cliente`.
3. Preencher `client_access.cliente_id` (coluna já existe, reservada).
4. Recriar views usando `cliente_id` como chave de join; manter `cliente` (texto) apenas para exibição.
5. Eventualmente: tornar `cliente_id` NOT NULL e indexar.

Enquanto isso, `cliente_nome` segue sendo a chave canônica de RLS via `current_user_clientes()`.

### 2. `current_user_clientes()` faz scan em `base_metricas` para admins
Substituir por catálogo dedicado (`clientes_catalogo` ou `vw_clientes_ativos` materializada) quando a base crescer e o `SELECT DISTINCT` ficar custoso. Validar com `EXPLAIN` antes de migrar.

### 3. Índices criados nesta etapa
- `idx_base_metricas_cliente_data (cliente, data)`
- `idx_base_metricas_plataforma (plataforma)`

Reavaliar índices adicionais (`metrica`, parciais por plataforma) após observar planos de execução reais.
