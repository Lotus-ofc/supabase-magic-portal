# Sync — Lovable / main

Marcador de sincronização do portal.

| Campo | Valor |
| ----- | ----- |
| Branch | `main` |
| Motivo | Forçar rebuild/sync Lovable após funil Plano Estratégico |
| Commits relevantes | `131329f` (aba inteligente), `fecb159` (RLS harden) |
| Data | 2026-07-13 |

## Checklist pós-sync

1. Confirmar build Lovable ok
2. Aplicar `supabase/migrations-official/31_plano_alinhamento.sql` no SQL Editor (se ainda não aplicado)
3. Smoke E2E: quiz cliente → publicar admin → dashboard cliente
