---
title: Auth Module v3
description: Registro oficial de conclusão da refatoração Auth + Access + Admin.
status: living
owner: Engenharia Lotus
tags: [auth, delivery, v3]
last_review: 2026-06-30
---

# Auth Module v3

## Status

✅ **Concluído**

## Data

30 de junho de 2026

---

## Resumo da entrega

- Separação **Auth / Access / Admin** com fronteiras enforceadas (ESLint + script CI)
- Fluxos oficiais **Supabase Auth** (sem implementação paralela de sessão)
- **Convite** estabilizado — sem login automático após definir senha
- **Recovery** estabilizado — sessão temporária apenas para `updateUser`
- **Callback** simplificado em `/auth/callback`
- **Recovery Mode** com 7 ações administrativas fechadas
- Arquitetura **desacoplada** — Auth zero Postgres da aplicação
- **Boundary validation** (`validate-auth-boundaries`) integrada ao `npm run check`
- Gate **fail-closed** em `assertAccessActive`
- Rotas Auth **thin adapters** com orchestrator injetado

---

## Escopo entregue

| Fase | Entrega |
| ---- | ------- |
| 0 | ESLint boundaries, script de validação, docs, migration 15 |
| 1 | Redirects/bloqueios em `modules/access/services/*` |
| 2 | Post-auth orchestrator; convite/recovery sem auto-login |
| 3 | `modules/auth` definitivo; Minha Conta |
| 4 | Split `access.functions.server`; lifecycle 6 estados |
| 5 | `modules/admin`; Recovery Mode 7 ações |
| 6 | Cleanup, re-exports deprecated, docs finais |

---

## Migrations obrigatórias (produção)

| Migration | Propósito |
| --------- | --------- |
| `13_access_management.sql` | `access_accounts`, audit, lifecycle |
| `14_access_lifecycle_fix.sql` | Backfill lifecycle pós-migration 13 |
| `15_auth_invalidate_sessions.sql` | RPC `access_invalidate_auth_sessions` |
| `16_lifecycle_invite_expired_removal.sql` | Dados `invite_expired` → `invite_pending` |

Ver [Migrations](../04-database/migrations.md).

---

## Validação de encerramento

| Gate | Resultado |
| ---- | --------- |
| `npm run check` | ✅ Verde (validate + lint + 88 testes + build) |
| Lint | ✅ |
| Build | ✅ |
| Arquivos temporários | ✅ Nenhum pendente |
| Git | ✅ Sincronizado com `origin/main` |

---

## Pendências conhecidas (fora desta versão)

- Melhorias futuras no Recovery Mode administrativo (UX e ações adicionais).
- Refinamentos de UX nos fluxos auth (copy, loading states).
- Evoluções de **autorização e lifecycle** devem ocorrer no módulo **Access**, nunca no Auth.
- Migração completa `features/access` → `modules/access/domain`.
- Remoção de stubs deprecated em `features/auth` após período de compatibilidade.
- Valor `invite_expired` permanece no enum Postgres (app normaliza em runtime).
- Fail-open residual em `postAuthOnLoginSuccess` quando montagem de profile falha (hardening futuro).

Esses itens estão no [Roadmap](../11-roadmap/roadmap.md#auth--access--próximas-evoluções).

---

## Commits principais

Série `refactor(auth)` / `fix(auth)` em `main` (jun/2026), culminando em:

- `feat(auth): finalize auth module v3 architecture` — encerramento oficial e documentação

---

## Referências

- [Arquitetura Auth, Access e Admin](../02-architecture/auth-access-admin.md)
- [Autenticação & Autorização](./auth.md)
- [ADR-0014](../02-architecture/adr/0014-auth-module-v3-architecture.md)
- [Troubleshooting Auth](../08-operations/troubleshooting.md#auth-e-convites)
