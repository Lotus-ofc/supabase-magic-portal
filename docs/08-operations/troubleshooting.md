---
title: Troubleshooting
description: Guia de diagnóstico para problemas comuns — dados, auth, build e deploy.
status: living
owner: Engenharia / Ops Lotus
last_review: 2026-06-26
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

| Causa | Solução |
|-------|---------|
| Make não rodou | Verificar ingestão externa |
| Nome cliente divergente | Adicionar alias |
| `valor IS NULL` | Corrigir pipeline Make |
| RLS / views | Ver [ADR-0003](../02-architecture/adr/0003-views-security-definer.md) |

---

## 401 Unauthorized em server function

| Causa | Solução |
|-------|---------|
| Sessão expirada | Re-login em `/auth` |
| Bearer não anexado | Verificar `attachSupabaseAuth` em `start.ts` |
| Env server ausente | `OFFICIAL_SUPABASE_URL`, `OFFICIAL_SUPABASE_ANON_KEY` |

---

## 403 Forbidden (admin)

| Causa | Solução |
|-------|---------|
| Usuário sem role `admin` | Inserir em `user_roles` via admin existente |
| Guard de rota | Esperado — cliente não acessa `/admin` |

---

## Build falha

```bash
npm ci
npm run build
```

| Erro comum | Solução |
|------------|---------|
| Env ausente no build | Variáveis `VITE_OFFICIAL_*` no ambiente |
| Plugin duplicado Vite | Não adicionar plugins já no preset Lovable |
| Tipos routeTree | Regenerar com `npm run dev` uma vez |

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

1. Aplicar em ordem numérica (`01` → `08`)
2. Cada migration tem bloco de validação no final
3. Idempotente — safe re-run

Ver [Migrations](../04-database/migrations.md).

---

## Onde pedir ajuda

> ⚠️ **INFORMAÇÃO NÃO ENCONTRADA** — canais Slack/Discord, on-call e owners por área.

---

## Referências

- [Runbook](./runbook.md)
- [Observabilidade](./observability.md)
- [Auth](../03-backend/auth.md)
