---
title: Central — cockpit operacional
description: Briefing inteligente, feed, filtros, prioridades, kanbans e cards de clientes.
---

# Central (`/admin/central`)

A **Central** é o cockpit operacional da agência (Agency OS). Reúne em uma única tela o que precisa de atenção **hoje**: saúde dos clientes, prioridades, produção, pipeline comercial e notas rápidas.

## Quando usar

- Abertura do dia — “o que está pegando?”
- Reunião de operação — visão unificada sem abrir dez abas.
- Triagem de clientes em atenção ou implantação.

## Pré-requisitos

- Usuário com papel **admin** (RLS exige `has_role` para criar/editar).
- Migrations **24–26** aplicadas no Supabase (`agency_leads`, `agency_projects`, `agency_tasks`, `agency_notes`). Sem isso, a tela carrega mas **salvar** falha com erro de tabela.

## Passo a passo ao abrir a tela

### 1. Barra de filtros (`AgencyFilterBar`)

No topo, refine a lista de clientes e KPIs:

| Filtro | Valores | Efeito |
| ------ | ------- | ------ |
| **Status** | ativo, implantação, negociação, pausado, atenção | Mostra só clientes naquele estágio |
| **Prioridade** | A, B, C, D | Classificação operacional da carteira |
| **Health** | excellent, good, attention, critical | Saúde calculada (métricas + operação) |
| **Serviço** | itens do catálogo | Clientes com aquele serviço contratado |
| **Busca** | texto livre | Nome ou slug do cliente |

**Como usar:** selecione um filtro → a URL atualiza (`?status=ativo&health=attention`) → você pode compartilhar o link com o time.

### 2. KPIs contextuais

Cinco cards no topo (receita, clientes, projetos, leads, campanhas) mudam conforme os filtros. Cada um mostra valor atual e tendência quando disponível.

### 3. Smart Briefing

Resumo em linguagem natural do estado da operação filtrada. Leia como “briefing da manhã” — destaca riscos, oportunidades e pendências.

### 4. Feed inteligente

Linha do tempo de eventos relevantes (tarefas, mudanças de status, alertas). Clique nos itens quando houver ação associada.

### 5. Prioridades (`PrioritiesSection`)

Lista ranqueada do que fazer primeiro, com base em regras de prioridade do Agency OS. Para cada item:

1. Leia o **motivo** da prioridade.
2. Use o atalho para o **cliente** ou **tarefa** vinculada.
3. Marque como resolvido quando concluir (conforme ações disponíveis no card).

### 6. Kanban de produção

Colunas de trabalho da agência (produção interna). **Arraste cards** entre colunas para atualizar status — a mudança persiste no servidor.

### 7. Pipeline comercial

Funil de leads/oportunidades. Útil para time comercial acompanhar negociação → fechamento.

### 8. Cards operacionais de clientes

Grade com um card por cliente filtrado. Em cada card você vê:

- Nome e status operacional
- Indicador de **health**
- Atalho para o **workspace do cliente** (`/admin/central/clientes/{id}`)

**Clique no card** para abrir o workspace completo com widgets (briefing do cliente, tarefas, notas, inteligência).

### 9. Adicionar nota (`AddNoteDialog`)

1. No card do cliente, clique no ícone **balão+** (ou menu ⋯ → Adicionar observação).
2. Escolha o **cliente** (se abriu pelo menu geral).
3. Escreva o texto — notas ficam no histórico operacional.
4. Confirme — a nota aparece no feed e no contexto do cliente.

### 10. Ações rápidas no topo

Na barra superior da Central você encontra:

| Botão | O que cria |
| ----- | ---------- |
| **Novo lead** | Card no pipeline (coluna Lead) |
| **Novo projeto** | Card no kanban de Produção |
| **Nova tarefa** | Item nas prioridades do dia |

Os mesmos botões aparecem nas seções **Pipeline** e **Produção**. Nos cards de cliente use **lápis** para editar status/prioridade/próxima ação.

### 11. Editar operação do cliente

1. No card do cliente, clique no ícone **lápis**.
2. Atualize **próxima ação**, **status operacional** ou **prioridade**.
3. Salve — reflete na carteira e nos filtros.

## Workspace do cliente (`/admin/central/clientes/{id}`)

Ao clicar em um cliente na Central:

1. **Dashboard em grid** — widgets registrados no OS Core (saúde, tarefas, briefing, etc.).
2. **Ações rápidas** — navegar para cadastro, aprovações ou plano estratégico daquele cliente.
3. Use como “mesa de trabalho” antes de ir às abas especializadas.

## Integrações com outras abas

| Ação na Central | Vai para |
| ----------------- | -------- |
| Configurar ingestão de dados | **Clientes** → aba Integrações |
| Aprovar conteúdo pendente | **Aprovações** (filtre o cliente) |
| Ver KPIs de mídia | **Visão geral** ou painel `/cliente/{slug}` |
| Estratégia de longo prazo | **Plano Estratégico** |

## Dicas operacionais

- Combine filtro `health=attention` + `status=ativo` para daily standup.
- Salve nos favoritos do navegador a URL com filtros da sua squad.
- Use `Ctrl+K` e digite o nome do cliente para pular direto ao workspace.

## Próximo capítulo

**Visão geral** — dashboard executivo com KPIs de todo o portfólio.
