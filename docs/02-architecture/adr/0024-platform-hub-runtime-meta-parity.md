---
title: ADR-0024 — Runtime, Meta official e paridade Make (Fases 3–7 in-memory)
status: Aceito
date: 2026-07-08
---

# ADR-0024 — Runtime, Meta official e paridade Make

## Contexto

As Fases 3–7 do Platform Hub v3.3 foram implementadas **sem alterar** contratos congelados,
Runtime/Pipeline/Health/Registry após congelamento, nem o fluxo Make → `base_metricas`.

O objetivo desta fatia foi provar a arquitetura de ponta a ponta in-process:

```
Provider → IngestEnvelope → MetricPipeline → MetricWriterPort
                                 ↕
              Baseline Reader (base_metricas) → ComparisonReport
```

## Decisão

1. **Persistência operacional** permanece in-memory (`ConnectionService`, `IdentityService`,
   `CredentialVault`, Health snapshots). Tabelas `ph_*` e UI `/admin/conexoes` ficam para
   sprints posteriores — não bloqueiam a validação arquitetural.
2. **OfficialMetaProvider** é o primeiro adapter oficial; lê tokens do CredentialVault
   (inserção manual nesta fase). `MetaOAuthService` existe como biblioteca; **callback HTTP
   OAuth permanece fora do escopo** até paridade Make ≥ limiar em staging.
3. **Writers:** MemoryWriter default; SupabaseWriter atrás de `PLATFORM_HUB_SUPABASE_WRITER`
   (bridge em `platform-hub-bridges/base-metricas/`).
4. **Paridade:** bridge `base-metricas-reader/` (somente leitura) + `compareMetrics` /
   `compareAgainstBaseline`. Não escreve; não conhece Provider/Runtime/OAuth.
5. Plugins TikTok / GBP / YouTube / Google Ads / GA4 permanecem em `make_passive` +
   stub `official_api` — template = Meta.
6. `registerPlatformHubModule` continua **não** wired em `os-bootstrap` — isolamento do Hub
   no Core até haver UI/persistência.
7. Publisher Runtime, `official_only` e remoção do Make **não** fazem parte desta fatia
   (Fases 13–14).

## Consequências

- `npm run check` governa contratos + architecture validators + testes do Hub.
- Consumidores usam `createPlatformHubStack` via `platform-hub/public`.
- Próximo gate de produção: dual-run staging com Baseline Reader real vs Make, então OAuth
  callback, então `ph_*` + UI.
