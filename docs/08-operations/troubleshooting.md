---
title: Troubleshooting
description: Guia de diagnóstico para problemas comuns — dados, auth, build e deploy.
status: living
owner: Engenharia / Ops Lotus
last_review: 2026-06-29
---

# Troubleshooting

---

## Dashboard vazio / sem dados

### Sintomas

Cards zerados, gráficos flat, "—" nos KPIs.

### Checklist

1. **Usuário logado?** Sem JWT → redirect `/auth`
2. **Cliente vinculado?** Cliente precisa de row em `client_access`
3. **Dados ingeridos?** `/admin/debug` → `getDebugSnapshot`
4. **Nome do cliente bate?** Aliases em `cliente_aliases` (ADR-0004)
5. **Período correto?** Usar BRT — ver [period.md](../06-engine/period.md)
6. **View retorna rows?** `/admin/debug/views` → amostra por view

### Causas frequentes

| Causa                   | Solução                                                               |
| ----------------------- | --------------------------------------------------------------------- |
| Make não rodou          | Verificar ingestão externa                                            |
| Nome cliente divergente | Adicionar alias                                                       |
| `valor IS NULL`         | Corrigir pipeline Make                                                |
| RLS / views             | Ver [ADR-0003](../02-architecture/adr/0003-views-security-definer.md) |

---

## 401 Unauthorized em server function

| Causa              | Solução                                               |
| ------------------ | ----------------------------------------------------- |
| Sessão expirada    | Re-login em `/auth`                                   |
| Bearer não anexado | Verificar `attachSupabaseAuth` em `start.ts`          |
| Env server ausente | `OFFICIAL_SUPABASE_URL`, `OFFICIAL_SUPABASE_ANON_KEY` |

---

## 403 Forbidden (admin)

| Causa                    | Solução                                      |
| ------------------------ | -------------------------------------------- |
| Usuário sem role `admin` | Ver seção **Restaurar admin do dono** abaixo |
| Guard de rota            | Esperado — cliente não acessa `/admin`       |

### Restaurar admin do dono (`leandromajr@gmail.com`)

O dono da plataforma deve ter role `admin` permanente. Migration `09_owner_admin_guard.sql`
garante isso no banco (trigger + bootstrap).

**Opção A — SQL Editor (Supabase Dashboard):**

Execute o arquivo `supabase/migrations-official/09_owner_admin_guard.sql` inteiro.

**Opção B — script local (requer service-role no `.env`):**

```bash
npm run ensure:owner-admin
```

Depois: logout → login novamente em `/auth` para atualizar a sessão.

---

## Convite por e-mail aponta para localhost

### Sintomas

O botão do e-mail de convite (usuário ou admin) abre `http://localhost:...` em vez do portal em produção.

### Causa

O Supabase usa a **URL de redirecionamento** configurada no envio do convite. Sem `APP_URL` no servidor, o projeto pode cair no **Site URL** padrão do dashboard (muitas vezes `localhost` de dev).

### Correção

1. **Runtime do app (Lovable ou Cloudflare):** defina `APP_URL` com a URL pública do portal, **sem barra no final**  
   Ex.: `https://portal.suaempresa.com`

2. **Supabase Dashboard → Authentication → URL Configuration:**
   - **Site URL:** mesma URL de produção (`APP_URL`)
   - **Redirect URLs:** inclua `https://portal.suaempresa.com/auth` (e `http://localhost:5173/auth` só para dev local)

3. **Redeploy** após alterar secrets (o convite é gerado no servidor com `redirectTo`).

4. **Reenviar convite:** usuários já convidados com link antigo precisam de novo convite (Admin → Usuários → novo usuário ou fluxo de reenvio).

### Local

No `.env` local use `APP_URL=http://localhost:5173` para testar convites em dev.

---

## Build falha

```bash
npm ci
npm run build
```

| Erro comum            | Solução                                    |
| --------------------- | ------------------------------------------ |
| Env ausente no build  | Variáveis `VITE_OFFICIAL_*` no ambiente    |
| Plugin duplicado Vite | Não adicionar plugins já no preset Lovable |
| Tipos routeTree       | Regenerar com `npm run dev` uma vez        |

---

## Lint falha (CRLF)

Windows pode reportar `Delete ␍` do Prettier.

```bash
npm run format
```

Considerar `.gitattributes` com `eol=lf`.

---

## Login não funciona

1. Verificar `VITE_OFFICIAL_SUPABASE_URL` e `ANON_KEY`
2. Confirmar usuário existe no Supabase Auth dashboard
3. Signup desabilitado no Supabase? (config projeto)
4. Storage: limpar `localStorage` key `sb-{projectId}-auth-token`

---

## Métricas divergentes entre telas

1. Verificar se compara overview (`metrics.ts`) vs platform (`engine.ts`)
2. Reach: MAX vs SUM — ver [platform-catalog](../06-engine/platform-catalog.md)
3. Views SQL calculam CTR — engine recalcula — ver [metrics-model](../04-database/metrics-model.md)

---

## Migrations

1. Aplicar em ordem numérica (`01` → `12`)
2. Cada migration tem bloco de validação no final
3. Idempotente — safe re-run
4. **View com colunas novas no meio:** use `DROP VIEW IF EXISTS` + `CREATE VIEW` (ver migration `05`)

Ver [Migrations](../04-database/migrations.md).

---

## `column vw_clientes_admin.<coluna> does not exist`

### Sintomas

Portal admin não carrega clientes; erro em `listClientes` ou páginas que dependem de `vw_clientes_admin`.

### Causa

O app pediu colunas (ex.: `tiktok_ativo`) que ainda não existem na view em produção — migration `05` não aplicada, ou view não recriada após `ALTER TABLE`.

### Solução

1. Aplicar `05_cadastro_clientes_make_ids.sql` completo no SQL Editor.
2. Se `CREATE OR REPLACE VIEW` falhar com `42P16`, use o script da migration corrigida (`DROP VIEW` + `CREATE VIEW`).
3. Validar colunas:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'vw_clientes_admin'
   ORDER BY ordinal_position;
   ```
4. O app usa `select("*")` em `listClientes` como compatibilidade; após migration 05, TikTok e IDs Make funcionam no cadastro.

---

## Erro `42P16` ao recriar view (`cannot change name of view column`)

Postgres interpreta colunas inseridas **no meio** da lista como rename. **Solução:** `DROP VIEW IF EXISTS public.vw_...` e em seguida `CREATE VIEW ...` (padrão adotado na migration `05`).

---

## Dashboard admin quebra com `AreaChartLotusLazy is not defined`

Gráfico de evolução em `/admin` sem import do componente lazy. Corrigido em `admin/index.tsx` — garantir deploy com import de `@/components/lotus/charts/AreaChartLotusLazy`.

---

## Onde pedir ajuda

> ⚠️ **INFORMAÇÃO NÃO ENCONTRADA** — canais Slack/Discord, on-call e owners por área.

---

## Referências

- [Runbook](./runbook.md)
- [Observabilidade](./observability.md)
- [Auth](../03-backend/auth.md)
