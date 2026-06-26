---
title: ADR-0004 — Chave de cliente por nome + aliases
status: Aceito (com dívida)
date: 2026-06-26
---

# ADR-0004 — Chave de cliente por nome + aliases

## Contexto

A tabela legada `base_metricas` identifica o cliente por **texto** (`base_metricas.cliente`),
vindo da planilha/Make. Esse texto diverge do nome oficial em
`cadastro_clientes.nome_cliente`. Exemplos reais (de `08_aliases_e_null_guard.sql`):

| base_metricas   | cadastro_clientes    |
| --------------- | -------------------- |
| `Antena`        | `Antena Imobiliária` |
| `Big Frio juec` | `BigFrioJuec`        |
| `Rafa Teo`      | `Rafa Teo Ferreira`  |

Toda a UI usa o nome canônico (links `/cliente/$cliente`, `client_access.cliente_nome`),
mas as views filtravam pelo texto literal de `base_metricas`. Consequência: cliente via
dashboard vazio; admin via cards duplicados (um por grafia).

## Decisão

Introduzir a tabela **`cliente_aliases`** (`nome_canonico` ↔ `alias_metricas`) e usar
`COALESCE(alias.nome_canonico, base_metricas.cliente)` em `vw_metricas_normalizadas`, de modo
que **todas as views exponham sempre o nome canônico**. `current_user_clientes()` também
retorna o nome canônico. Nenhum dado de `base_metricas` é alterado e nenhum cenário do Make
precisa mudar.

## Alternativas consideradas

- **Normalizar `base_metricas` para FK por ID:** solução definitiva, mas exige reescrever o
  pipeline de ingestão (Make) e migrar dados legados.
- **Renomear dados na origem (planilha/Make):** frágil e manual, sem garantia de consistência.

## Consequências

### Positivas

- Resolve dashboards vazios/duplicados sem tocar na origem.
- Centraliza a reconciliação em uma tabela auditável.

### Negativas / dívidas

- Aliases são **seeds manuais** (3 conhecidos): não escala; novos descasamentos exigem
  inserção manual.
- A junção principal continua **textual**, não por FK. Migrar para chave por ID é a dívida
  estrutural prioritária do [Roadmap](../../11-roadmap/roadmap.md).
