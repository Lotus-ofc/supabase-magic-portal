---
title: Usuários — contas e papéis
description: Criar usuários, papéis admin/cliente e vínculo client_access.
---

# Usuários (`/admin/usuarios`)

Gerencia **quem entra** na plataforma, com qual **papel** e a qual **cliente** está vinculado.

## Papéis disponíveis

| Papel       | Acesso                                                                                |
| ----------- | ------------------------------------------------------------------------------------- |
| **admin**   | Todo o painel `/admin/*`, todos os clientes                                           |
| **cliente** | Apenas `/dashboard`, `/plano-estrategico`, `/aprovacoes` e painéis da marca vinculada |

O e-mail do **dono da plataforma** (platform owner) tem admin implícito.

## Lista (`/admin/usuarios`)

Mostra usuários com:

- E-mail
- Papel atual
- Clientes vinculados (`client_access`)
- Data de criação

## Criar usuário (`/admin/usuarios/novo`)

Passo a passo:

1. Clique **Novo usuário**.
2. Informe **e-mail** — será o login.
3. Defina **senha temporária** ou envie convite (conforme fluxo habilitado).
4. Escolha o **papel**:
   - **admin** — equipe interna da agência
   - **cliente** — contato da marca
5. Se papel = **cliente**, marque um ou mais **clientes** em `client_access`.
6. Salve.

O backend usa service-role para criar a conta no Supabase Auth.

## Editar acesso

1. Abra o usuário na lista.
2. Altere papel ou vínculos de cliente.
3. Salve — efeito imediato no próximo login.

## Impersonar cliente (admin)

Na barra superior (painel admin), menu **Impersonar**:

1. Escolha o cliente.
2. A sessão navega como se fosse o cliente — útil para suporte.
3. Encerre a impersonação para voltar ao admin.

## Boas práticas de segurança

- Mínimo de admins — só quem precisa de `/admin`.
- Cliente **nunca** deve ter papel admin.
- Um e-mail de cliente só deve ver marcas autorizadas em `client_access`.
- Desative/remova usuários que saíram da empresa do cliente.

## Relação com outras abas

| Necessidade          | Onde configurar                               |
| -------------------- | --------------------------------------------- |
| Cliente existe       | **Clientes**                                  |
| Serviços do contrato | **Clientes** + **Serviços**                   |
| Aprovar conteúdo     | Usuário cliente em **Aprovações**             |
| Ver métricas         | `client_access` + integrações em **Clientes** |

## Próximo capítulo

**Serviços** — catálogo do que a agência vende e vincula aos clientes.
