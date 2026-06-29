---
title: Changelog
description: Histórico de mudanças relevantes do Lots BI (produto, dados e infraestrutura).
status: living
owner: Engenharia Lots BI
last_review: 2026-06-26
---

# Changelog

Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/) e
[SemVer](https://semver.org/lang/pt-BR/). Toda mudança visível ao usuário ou relevante para
operação deve gerar uma entrada aqui, **no mesmo PR** (ver
[Doc-as-Code](../09-standards/documentation.md)).

Categorias: `Adicionado`, `Alterado`, `Corrigido`, `Removido`, `Segurança`, `Dados`.

---

## [Não lançado]

### Adicionado

- **Refinamento SaaS (camada app):** `MetricLabel`, tooltips em todos os KPIs (`METRIC_META`),
  `EmptyState`, `DashboardSkeleton`, `SyncStatusBar`, `GlobalSearch` (Ctrl+K),
  `NotificationCenter`, workflow de aprovações com preview ampliável e timeline,
  fallbacks de logo/favicon via CDN Supabase.
- **Rebranding Lots BI:** nova identidade visual (logo, favicon, og-image, cores `#A855F7` → `#60A5FA`),
  metadados, títulos de aba, login e assets em `public/brand/`.
- **Knowledge Center:** módulo admin `/admin/knowledge` — renderiza `docs/**/*.md` com busca,
  navegação colapsável, Mermaid, favoritos, recentes e metadados YAML. Documentação de
  plataformas em `06-dashboards/platforms/`.
- **Setup interno:** `SETUP.md`, `npm run setup`, ADR-0012, deploy Cloudflare manual
  (`deploy.yml`, `npm run deploy:cloudflare`), `error-reporting.ts` genérico.
- **Segurança:** `.env` adicionado ao `.gitignore`.

### Corrigido

- **Admin permanente do dono:** `has_role` reconhece `leandromajr@gmail.com`, auto-reparo no login
  (`owner-admin.ts`) e migration `09_owner_admin_guard.sql` reforçada.

### Alterado

- **Pronto para clientes:** rotas `/cliente/{slug}` corrigidas (slugify), login somente por convite,
  barra de sync, tooltips em KPIs, workflow de aprovações, pesquisa global e central de notificações.
- **Sistema de Engenharia fundado (ADR-0011):** CI, Vitest, CONTRIBUTING, governança, `npm run check`.
- **Deployment & Padrões:** Lovable transitório (build/deploy); Cursor como dev oficial.

### Adicionado (sistema de engenharia)

- **CI:** `.github/workflows/ci.yml` — lint, test, build, validate
- **Testes:** Vitest + `formulas.test.ts`, `period.test.ts`
- **Governança:** `CONTRIBUTING.md`, PR template, `governance.md`, `engineering-system.md`
- **Automação:** `scripts/validate-engineering.mjs`, `npm run check`
- **`.gitattributes`** + Prettier LF
- **ADR-0011** — Fundação do Sistema de Engenharia
- **Regra Cursor:** `lotus-governance.mdc`

### Adicionado (auditoria CTO)

- **Auditoria de completude** (`docs/AUDIT.md`) — matriz cobertura, lacunas L1–L9, roteiro sênior 4h.
- **Auth & Segurança:** `03-backend/auth.md`, `security.md`.
- **RLS:** catálogo completo de policies (`04-database/rls-policies.md`).
- **Engine:** seção `06-engine/` (overview, platform-catalog, formulas, period, overview-aggregation).
- **Admin:** módulos operacionais (`06-dashboards/admin-modules.md`).
- **Ops:** environments, cicd, observability, troubleshooting.
- **Padrões:** testing strategy, code-organization.
- **Frontend:** repository-structure, observability-errors.
- **`.env.example`** na raiz do projeto.
- Procedimento manual de migrations documentado.

### Adicionado

- **Fluxo oficial de desenvolvimento:** Cursor como ambiente de engenharia; Lovable rebaixado
  a build/deploy transitório.
- **ADR-0010:** Cursor como ambiente oficial de engenharia.
- **`.cursor/rules/lotus-engineering.mdc`:** regras de qualidade, arquitetura e Definition of Done.
- **`docs/09-standards/development-workflow.md`:** pipeline Dev → Git → GitHub → Deploy.
- **START HERE** (`docs/START_HERE.md`): ponto de entrada principal do handbook (< 1h).
- **Estado atual vs arquitetura alvo:** documentos dedicados em `02-architecture/`.
- **Missão & Visão Estratégica** (`00-company/mission.md`).
- **Modelo de métricas** (`04-database/metrics-model.md`): oficiais vs derivadas + gap atual.
- **Pipeline Make (transitório)** e **Coletores alvo** (`07-integrations/`).
- **ADRs 0007–0009:** métricas na app, coletores proprietários, infra proprietária.
- **Roadmap expandido** (Fases 4–6: coletores, motor de métricas, infra proprietária).
- **Centro de Conhecimento da Lotus** (`docs/`): handbook completo com ADRs, diagramas,
  runbook, onboarding e regra Cursor para manutenção contínua.

---

## Histórico reconstruído (a partir das migrations)

> As datas abaixo não estão registradas no repositório; a ordem segue a numeração das
> migrations em `supabase/migrations-official/`.

### Dados / Segurança

- **08 — Aliases e guarda de NULL.** Tabela `cliente_aliases` + `COALESCE` para nome canônico
  nas views; exclusão de `valor NULL`. Corrige dashboards vazios/duplicados por divergência de
  nome. Ver [ADR-0004](../02-architecture/adr/0004-chave-de-cliente-por-nome-e-aliases.md).
- **07 — Correção de dashboards vazios.** Views recriadas como `SECURITY DEFINER`. Ver
  [ADR-0003](../02-architecture/adr/0003-views-security-definer.md).
- **06 — Calendário editorial.** Tabelas `posts_editorial`/`post_revisions`, enums e RLS.
- **05 — IDs técnicos do Make.** Colunas de integração em `cadastro_clientes` (substitui a 04,
  deprecada).
- **03 — Extensão de cadastro.** Colunas comerciais, `servicos`, `cliente_servicos`,
  `vw_clientes_admin`.
- **02 — Views analíticas (1ª versão).** Conversão de micros do Google Ads; pivots por
  plataforma.
- **01 — Auth, papéis e acesso.** `profiles`, `user_roles`, `has_role`, `client_access`,
  `current_user_clientes`.

---

## Como adicionar uma entrada

1. Em todo PR com mudança relevante, adicione um bullet na seção **[Não lançado]**, na
   categoria certa.
2. Referencie o ADR/issue quando aplicável.
3. Ao "lançar", renomeie **[Não lançado]** para `[vX.Y.Z] - AAAA-MM-DD` e abra uma nova
   seção **[Não lançado]** no topo.
