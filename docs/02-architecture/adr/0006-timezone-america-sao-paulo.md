---
title: ADR-0006 — Timezone fixo America/Sao_Paulo
status: Aceito
date: 2026-06-26
---

# ADR-0006 — Timezone fixo America/Sao_Paulo

## Contexto

Dashboards dependem de janelas como "últimos 30 dias", "hoje", "este mês". Usar
`new Date().toISOString()` para derivar "hoje" retorna o dia em **UTC**. No fuso de São Paulo
(UTC-3), entre 21:00 e 23:59 o "hoje UTC" já é o dia seguinte — deslocando o último dia do
período e corrompendo deltas.

## Decisão

Centralizar toda a aritmética temporal em `src/lib/period.ts`, com fuso fixo
**`America/Sao_Paulo`**:

- `brtToday()` deriva o dia atual via `Intl.DateTimeFormat("en-CA", { timeZone })` → `YYYY-MM-DD`.
- Datas trafegam como **strings `YYYY-MM-DD` date-only** (sem horário/timezone).
- `addDaysISO` / `diffDaysISO` operam sobre strings em UTC midnight para não sofrer drift.
- `resolvePeriod` produz `{ from, to, prevFrom, prevTo, days, label }` para qualquer preset.

A regra está documentada como comentário no topo de `period.ts` e `metrics.ts`:

> NUNCA usar `Date.toISOString()` para derivar "hoje".

## Alternativas consideradas

- **UTC em todo lugar:** simples, mas mostra o dia errado ao usuário brasileiro à noite.
- **Timezone do navegador:** inconsistente entre usuários e entre cliente/servidor (SSR).

## Consequências

### Positivas

- "Hoje" e janelas sempre corretos para o público-alvo (Brasil).
- Comparações de período determinísticas e livres de drift.

### Negativas / dívidas

- Fuso fixo: clientes em outro fuso veriam o dia brasileiro. Hoje é aceitável (público BR);
  internacionalização exigiria parametrizar o fuso.
