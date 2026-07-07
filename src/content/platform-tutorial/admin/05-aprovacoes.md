---
title: Aprovações — Content Workflow
description: Kanban, calendário, pilares, stories, biblioteca, cards e status do fluxo.
---

# Aprovações (`/admin/aprovacoes`)

A aba **Aprovações** é o **Content Workflow** — sistema de produção, revisão e publicação de conteúdo. Substitui o antigo Calendário Editorial.

## Conceitos-chave

- **Card** — unidade de conteúdo (post, story, vídeo, etc.).
- **Status** — etapa no fluxo (ver tabela abaixo).
- **Evento** — histórico imutável de cada mudança no card.
- **Cliente** — todo conteúdo pertence a um cliente; selecione-o no topo.

### Status do fluxo

```
producao → edicao → aguardando_aprovacao → aprovado → publicado → arquivado
```

| Status | Quem age | O que fazer |
| ------ | -------- | ----------- |
| producao | Time de criação | Produzir arte/copy |
| edicao | Editor | Refinar antes de enviar ao cliente |
| aguardando_aprovacao | Cliente ou admin | Aguardar OK do cliente |
| aprovado | Publicação | Agendar ou publicar |
| publicado | — | Conteúdo no ar |
| arquivado | — | Histórico, fora do fluxo ativo |

## Passo 1 — Selecionar o cliente

1. No topo, abra o **seletor de cliente**.
2. Escolha a marca — todas as abas abaixo carregam dados **somente** daquele cliente.
3. Se a lista estiver vazia, cadastre o cliente em **Clientes** primeiro.

## Passo 2 — Escolher a visualização (abas internas)

| Aba | URL (`?tab=`) | Função |
| --- | ------------- | ------ |
| **Kanban** | `kanban` (padrão) | Colunas por status; arrastar cards |
| **Calendário** | `calendar` | Visão por data de publicação |
| **Pilares** | `pillars` | Pilares editoriais estratégicos |
| **Stories** | `stories` | Plano de stories Instagram |
| **Biblioteca** | `library` | Repositório de assets aprovados |

A URL guarda a aba — você pode compartilhar `?tab=calendar` com o time.

## Passo 3 — Criar um card

1. Clique **Novo card** (ou botão +).
2. Preencha:
   - **Título** — identificação interna
   - **Tipo de conteúdo** — post, story, reel, etc.
   - **Data prevista** de publicação
   - **Pilar editorial** (opcional, se já cadastrado)
   - **Legenda / copy** — texto do post
   - **Anexos** — imagens, vídeos, PDFs
3. Salve — o card nasce em **producao** (ou status inicial configurado).

## Passo 4 — Mover no Kanban

1. Abra a aba **Kanban**.
2. **Arraste** o card para a coluna do próximo status.
3. Ao soltar, o sistema grava um **evento** na timeline do card.
4. Clique no card para abrir o **drawer de detalhe** — veja anexos, comentários e histórico.

## Passo 5 — Detalhe do card (drawer)

No drawer você pode:

- Editar campos (título, legenda, data)
- Adicionar **comentários** internos
- Ver **timeline** de eventos
- Anexar novos arquivos
- Enviar para **aguardando_aprovacao** quando pronto

## Passo 6 — Pilares editoriais

1. Aba **Pilares**.
2. **Criar pilar** — nome, descrição, cor (organização temática).
3. Ao criar cards, vincule ao pilar — facilita calendário e relatórios editoriais.

## Passo 7 — Plano de Stories

1. Aba **Stories**.
2. Monte a grade de stories da semana (arrastar, reordenar).
3. Sincroniza com cards do tipo story no Kanban.

## Passo 8 — Biblioteca

1. Aba **Biblioteca**.
2. Conteúdos **aprovados/publicados** ficam arquivados para reuso.
3. Busque por tag, pilar ou data.

## Dashboard operacional

Rota auxiliar: `/admin/aprovacoes/dashboard` — visão de métricas do workflow (cards por status, gargalos). Acesse pelo ícone de gráfico na página de Aprovações.

## Portal do cliente

O cliente aprova em:

- `/aprovacoes` — quando tem acesso direto
- `/cliente/{slug}/aprovacoes` — contexto da marca

Lá ele vê Kanban/Calendário em modo leitura e pode **aprovar** ou **reprovar** com comentário.

## Integração com Plano Estratégico

Na URL você pode passar `?estrategia={uuid}` para filtrar cards vinculados a uma estratégia do plano. Cadastre a estratégia em **Plano Estratégico** primeiro.

## Boas práticas

- Um card = uma peça publicável (não agrupe campanhas inteiras).
- Sempre anexe preview visual antes de `aguardando_aprovacao`.
- Use comentários no drawer em vez de WhatsApp — fica na timeline.
- Arquive cards antigos para o Kanban não poluir.

## Estados de carregamento e vazio

Após o Refinement Sprint v1:

- **Kanban sem cards** — mensagem clara com botão para criar o primeiro card (admin)
- **Drawer de card** — skeleton enquanto carrega detalhes e timeline
- **Story Plan** — skeleton na aba de plano semanal
- **Biblioteca** — skeleton ao abrir detalhe de item publicado

Se a tela parecer “travada”, aguarde o skeleton ou recarregue a página.

## Próximo capítulo

**Plano Estratégico** — diagnóstico, objetivos, hipóteses e decisões.
