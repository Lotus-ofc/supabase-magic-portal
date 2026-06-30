---
title: Instagram — Dashboard
description: Métricas orgânicas do Instagram, agregação MAX para reach e KPIs de engajamento.
status: living
owner: Engenharia / Dados Lotus
tags: [dashboard, instagram, platformdef]
difficulty: intermediate
last_review: 2026-06-26
---

# Instagram

## Origem dos dados

| Item         | Valor                            |
| ------------ | -------------------------------- |
| Platform key | `instagram`                      |
| View SQL     | `vw_instagram_diario`            |
| PlatformDef  | `src/lib/platforms/instagram.ts` |

## Métricas oficiais

| Key                | Coluna             | Agregação |
| ------------------ | ------------------ | --------- |
| reach              | reach              | **max**   |
| accounts_engaged   | accounts_engaged   | **max**   |
| interactions       | interactions       | sum       |
| likes              | likes              | sum       |
| comments           | comments           | sum       |
| saves              | saves              | sum       |
| shares             | shares             | sum       |
| profile_links_taps | profile_links_taps | sum       |

## KPIs derivados

- **Engagement rate:** `interactions / reach × 100`
- Média diária de interações (card comparativo)

## Comportamento

Estratégia **MAX** para `reach` está documentada no próprio `PlatformDef` — ajustável sem alterar componentes de UI.

## Referências

- [Catálogo de plataformas](../../06-engine/platform-catalog.md)
