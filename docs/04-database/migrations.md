---
title: Banco — Migrations
description: Histórico, convenções e princípios das migrations da Lotus.
status: living
owner: Engenharia Lotus
last_review: 2026-06-26
---

# Migrations

As migrations vivem em `supabase/migrations-official/` e seguem três princípios inegociáveis:

1. **Aditivas** — só adicionam (colunas, tabelas, views, índices). Nunca `DROP`/`RENAME`/
   `ALTER TYPE`/`DELETE` em estruturas legadas.
2. **Idempotentes** — re-executáveis com segurança (`IF NOT EXISTS`, `CREATE OR REPLACE`,
   `DO $$ ... EXCEPTION WHEN duplicate_object`).
3. **Autoexplicativas** — comentam a causa-raiz e, quando útil, trazem passos de validação.

---

## Histórico

| Arquivo                             | O que faz                                                                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_auth_roles_access.sql`          | `profiles` + trigger `handle_new_user`; enum `app_role`; `user_roles`; `has_role`; `client_access`; `current_user_clientes` (1ª versão); índices em `base_metricas`.                   |
| `02_views_metricas.sql`             | 1ª versão das views analíticas (com `security_invoker = on`). Conversão de micros do Google Ads.                                                                                       |
| `03_cadastro_clientes_extensao.sql` | Colunas aditivas em `cadastro_clientes`; RLS; `servicos` + seed; `cliente_servicos`; `vw_clientes_admin`.                                                                              |
| `05_cadastro_clientes_make_ids.sql` | IDs técnicos consumidos pelo Make (instagram/meta/google/ga4/tiktok); refresh de `vw_clientes_admin`.                                                                                  |
| `06_editorial.sql`                  | Enums e tabelas do editorial (`posts_editorial`, `post_revisions`) + RLS.                                                                                                              |
| `07_views_fix_security_invoker.sql` | **Correção de dashboards vazios:** recria views como `SECURITY DEFINER`. Ver [ADR-0003](../02-architecture/adr/0003-views-security-definer.md).                                        |
| `08_aliases_e_null_guard.sql`       | `cliente_aliases` + `COALESCE` para nome canônico; guarda de `valor NULL`; recria views derivadas. Ver [ADR-0004](../02-architecture/adr/0004-chave-de-cliente-por-nome-e-aliases.md). |

> **Não existe `04`.** A tentativa `04_integracoes_make.sql` foi **deprecada e substituída**
> pela `05` (que usa nomes de coluna diferentes); a 04 nunca foi aplicada ao banco.

---

## Convenções ao escrever uma migration nova

- Numere sequencialmente (`09_...`, `10_...`) com nome descritivo em snake_case.
- Comece com um cabeçalho comentando: objetivo, o que **não** altera, e por quê.
- Use guardas de idempotência:
  ```sql
  ALTER TABLE public.x ADD COLUMN IF NOT EXISTS y text;
  CREATE TABLE IF NOT EXISTS public.z (...);
  CREATE OR REPLACE VIEW public.vw_... AS ...;
  DO $$ BEGIN CREATE TYPE ... ; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  ```
- Sempre conceda os GRANTs corretos (`authenticated`, `service_role`) e habilite RLS +
  policies ao criar tabelas.
- Se a mudança recria uma view, recrie também as views dependentes (Postgres pode invalidá-las).
- Inclua um bloco de **validação manual** comentado ao final (ver exemplo na 08).

> Fluxo manual documentado abaixo. Automatizar via CI é item do [Roadmap](../11-roadmap/roadmap.md).

---

## Como aplicar migrations (procedimento manual)

Projeto Supabase: `ywvhoctcmibjitvwkkhb`.

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor.
2. Execute cada arquivo em **ordem numérica** (`01` → `08`).
3. Cada migration é idempotente — re-executar é seguro.
4. Ao final de cada arquivo, rode o bloco de **validação** comentado (quando existir).
5. Atualize este doc se criar migration `09+`.

### Ordem obrigatória

```
01_auth_roles_access.sql
02_views_metricas.sql
03_cadastro_clientes_extensao.sql
05_cadastro_clientes_make_ids.sql    ← pular 04 (deprecada)
06_editorial.sql
07_views_fix_security_invoker.sql
08_aliases_e_null_guard.sql
```

### Rollback

Migrations são **aditivas** — não há rollback automático. Reverter exige migration compensatória
nova (nunca editar migration já aplicada em produção).

### Ambiente local com Supabase CLI (futuro)

Quando `supabase/config.toml` existir:

```bash
supabase db push
```

Hoje **não configurado** neste repositório.
