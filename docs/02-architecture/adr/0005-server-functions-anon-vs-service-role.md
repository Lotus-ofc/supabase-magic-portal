---
title: ADR-0005 — Separação anon vs service-role
status: Aceito
date: 2026-06-26
---

# ADR-0005 — Separação anon vs service-role

## Contexto

Algumas operações precisam de privilégio acima da RLS do usuário — por exemplo, listar todos
os usuários de auth (`auth.admin.listUsers`), criar usuários por convite, atribuir papéis.
Expor a chave service-role (que ignora RLS) no browser seria uma falha grave de segurança.

## Decisão

Manter **dois clients Supabase distintos**:

- **anon** (`src/integrations/supabase/client.ts`) — usado no browser e em SSR; sempre
  sujeito a RLS; sessão persistida em `localStorage`.
- **service-role** (`src/integrations/supabase/client.server.ts`) — usado **somente no
  servidor**; o sufixo `.server.ts` impede import no client.

Server functions validam o Bearer token do usuário via `requireSupabaseAuth`
(`src/integrations/supabase/auth-middleware.ts`), expondo um client com a **RLS do próprio
usuário** no contexto. Só quando estritamente necessário a função importa dinamicamente o
`supabaseAdmin` (service-role). As variáveis usam prefixo `OFFICIAL_` porque `SUPABASE_` é
reservado pela plataforma Lovable.

## Alternativas consideradas

- **Um único client service-role no servidor para tudo:** simplifica, mas perde a checagem de
  RLS por usuário e amplia o raio de impacto de qualquer bug.
- **Apenas anon + RLS para tudo:** impossível para operações de `auth.admin`.

## Consequências

### Positivas

- O segredo de maior privilégio nunca chega ao browser.
- Operações normais rodam com a RLS do usuário (menor raio de impacto).
- Validação de input com Zod em todas as server functions.

### Negativas / dívidas

- Exige disciplina: qualquer import acidental de `.server.ts` no client quebra a garantia
  (mitigado pela convenção de sufixo).
- Tipagem ainda usa `any` em alguns helpers admin (`assertAdmin`) — endurecer é desejável.
