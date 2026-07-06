---
title: Atalhos e busca global
description: Ctrl+K, notificações, impersonação e fluxos rápidos.
---

# Atalhos e busca global (`Ctrl+K`)

A **busca global** é o atalho mais poderoso do painel admin. Abre uma paleta de comandos sem trocar de aba.

## Como abrir

- **Windows/Linux:** `Ctrl + K`
- **macOS:** `⌘ + K`
- Ou clique no ícone de busca na barra superior.

## O que você pode encontrar

| Categoria | Exemplos |
| --------- | -------- |
| **Rotas** | “Central”, “Aprovações”, “Clientes” |
| **Clientes** | Digite o nome → abre workspace ou painel |
| **Agency OS** | Comandos registrados no OS Core |
| **Glossário** | Definições de métricas (CTR, CPA…) |

## Passo a passo: ir ao cliente em 3 segundos

1. `Ctrl+K`
2. Digite parte do nome — ex.: “acme”
3. Selecione **Cliente: Acme Corp** com setas + Enter
4. Você cai no destino configurado (workspace ou painel analítico)

## Passo a passo: criar fluxo operacional

| Tarefa | Atalho de busca |
| ------ | --------------- |
| Novo cliente | “novo cliente” → `/admin/clientes/novo` |
| Aprovações | “aprovações” |
| Debug ingestão | “debug” ou “painel operacional” |
| Tutorial | “tutorial” |

## Central de notificações

Ícone de sino na barra:

- Alertas da sessão (aprovações, sync, avisos locais)
- Clique para marcar como lida
- Não substitui e-mail — é conveniência in-app

## Impersonar cliente

Somente **admin**:

1. Menu impersonar (barra superior).
2. Escolha cliente.
3. Navegue como cliente — valide `/dashboard` e `/aprovacoes`.
4. **Saia** da impersonação ao terminar (evita edições acidentais).

## Atalhos de navegação lateral

Memorize a ordem do menu **Operações**:

1. Central — operação
2. Visão geral — números macro
3. Relatórios — por cliente
4. Aprovações — conteúdo
5. Plano Estratégico — estratégia
6. Clientes — cadastro
7. Usuários — acessos
8. Serviços — catálogo

## Knowledge Center vs Tutorial

| Recurso | Público | Conteúdo |
| ------- | ------- | -------- |
| **Tutorial** (`/admin/tutorial`) | Operação e clientes | Passo a passo de uso |
| **Knowledge Center** | Engenharia / produto | ADRs, APIs, arquitetura |

Use Knowledge para detalhe técnico de migrations; use Tutorial para treinar equipe e clientes.

## Fim do tutorial admin

Você cobriu todas as abas do painel administrativo. Para treinar clientes finais, indique o **Tutorial** no menu deles (`/tutorial`).
