---
title: Relatórios — hub por cliente
description: Atalhos executivos, ranking, busca e links para dashboards individuais.
---

# Relatórios (`/admin/relatorios`)

A **Central de Relatórios** organiza o acesso aos números sem duplicar os dashboards. Pense nela como **índice + ranking** do portfólio.

## Estrutura da tela

### 1. Atalhos no topo

Dois cards grandes:

| Atalho                         | Destino      | Quando usar                       |
| ------------------------------ | ------------ | --------------------------------- |
| Relatório executivo da agência | `/admin`     | Visão consolidada com gráficos    |
| Sua conta (visão cliente)      | `/dashboard` | Ver exatamente o que o cliente vê |

### 2. Seletor de período

Igual à Visão geral: **7 / 30 / 90 dias**. Todos os rankings abaixo respeitam o período.

### 3. KPIs resumidos

Investimento total, conversões, CTR médio, clientes com dados no período.

### 4. Tabela / lista de clientes

Para cada cliente ativo:

- Nome e slug
- Investimento no período
- Conversões, cliques, impressões (conforme disponível)
- CTR e CPA derivados
- **Plataformas ativas** (badges)
- **Última ingestão**
- Link **Abrir relatório** → `/cliente/{slug}`

### 5. Busca

Campo de busca filtra por nome do cliente em tempo real — útil com dezenas de contas.

## Passo a passo: preparar reunião mensal

1. Defina período **30 dias**.
2. Ordene mentalmente pelo investimento (a lista já vem ranqueada).
3. Para cada cliente top 5, clique **Abrir relatório** e valide:
   - Mix de plataformas
   - Comparativo 7/30/90 no painel do cliente
   - Insights automáticos na lateral
4. Anote clientes com ingestão atrasada — acione integrações antes da reunião.
5. Use o atalho **Relatório executivo** para slide de abertura com totais.

## Diferença vs Visão geral

| Aspecto                       | Visão geral | Relatórios             |
| ----------------------------- | ----------- | ---------------------- |
| Gráficos temporais            | Sim         | Não (hub)              |
| Lista por cliente             | Secundária  | **Foco principal**     |
| Busca por nome                | Não         | Sim                    |
| Link direto ao painel cliente | Parcial     | **Sim, em cada linha** |

## Próximo capítulo

**Aprovações** — fluxo completo de produção de conteúdo (Content Workflow).
