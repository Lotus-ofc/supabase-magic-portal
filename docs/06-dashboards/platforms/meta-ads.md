---
title: Meta Ads — Dashboard
description: Origem dos dados, métricas, fórmulas e semântica de reach no dashboard Meta Ads.
status: living
owner: Engenharia / Dados Lotus
tags: [dashboard, meta-ads, platformdef]
difficulty: intermediate
last_review: 2026-06-26
---

# Meta Ads

## Origem dos dados

| Item | Valor |
| ---- | ----- |
| Platform key | `meta_ads` |
| View SQL | `vw_meta_ads_diario` |
| PlatformDef | `src/lib/platforms/meta-ads.ts` |

## Métricas oficiais

| Key | Coluna | Agregação | Nota |
| --- | ------ | --------- | ---- |
| spend | spend | sum | |
| reach | reach | **sum** | Soma diária no dashboard |
| impressions | impressions | sum | |
| clicks | clicks | sum | |

## KPIs derivados

CTR, CPC, CPM, **Frequency** (`impressions / reach`)

## Limitações e dívida técnica

No **dashboard Meta**, `reach` agrega com **SUM** (soma dos reaches diários).

No **overview** (`metrics.ts`), métricas similares podem usar **MAX** — diferença documentada como dívida D8 a unificar.

## Comportamento na UI

- Frequency aparece como KPI derivado quando reach > 0.
- Filtros de período aplicam-se à view diária antes da agregação.

## Referências

- [Catálogo de plataformas](../../06-engine/platform-catalog.md)
