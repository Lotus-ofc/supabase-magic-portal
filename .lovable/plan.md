
# Central de Integrações — Estrutura Final (revisão pós-ajustes)

Plano consolidado já com os 6 ajustes solicitados. Nenhuma implementação iniciada — aprovação em duas frentes: **banco** e **interface**.

---

## 1. Estrutura final do banco

Uma única migration aditiva e idempotente: `supabase/migrations-official/04_integracoes_make.sql`.

```sql
ALTER TABLE public.cadastro_clientes
  -- Google Ads
  ADD COLUMN IF NOT EXISTS google_ads_customer_id        text,
  -- Meta Ads (Ad Account + Pixel)
  ADD COLUMN IF NOT EXISTS meta_ad_account_id            text,
  ADD COLUMN IF NOT EXISTS meta_pixel_id                 text,
  -- Instagram
  ADD COLUMN IF NOT EXISTS instagram_business_account_id text,
  -- GA4
  ADD COLUMN IF NOT EXISTS ga4_property_id               text,
  -- TikTok
  ADD COLUMN IF NOT EXISTS tiktok_ad_account_id          text,
  ADD COLUMN IF NOT EXISTS tiktok_ativo                  boolean NOT NULL DEFAULT false;

-- Re-expor todas as colunas de integração em vw_clientes_admin
CREATE OR REPLACE VIEW public.vw_clientes_admin
WITH (security_invoker = on) AS
SELECT
  cc.*,
  COALESCE((
    SELECT array_agg(s.nome ORDER BY s.nome)
    FROM public.cliente_servicos cs
    JOIN public.servicos s ON s.id = cs.servico_id
    WHERE cs.cadastro_cliente_id = cc.id AND cs.ativo = true
  ), ARRAY[]::text[]) AS servicos,
  (SELECT count(*) FROM public.client_access ca
     WHERE ca.cliente_nome = cc.nome_cliente) AS qtd_acessos
FROM public.cadastro_clientes cc;

GRANT SELECT ON public.vw_clientes_admin TO authenticated;
```

Regras respeitadas:
- Apenas `ADD COLUMN IF NOT EXISTS` / `CREATE OR REPLACE VIEW`.
- Sem `DROP`, sem `ALTER TYPE`, sem renomear, sem `DELETE`.
- `base_metricas`, views analíticas (`vw_*_diario`, `vw_overview_cliente`), RLS, GRANTs e policies permanecem intactos — as policies de `cadastro_clientes` já cobrem qualquer coluna nova.
- `google_business_location_id` é preservada (foi criada na migration 01) e simplesmente passa a ser editada na nova seção Integrações.
- `tiktok_ativo` é a única flag boolean nova; as demais flags antigas (`google_ads_ativo`, `meta_ativo`, `ga4_ativo`, `instagram_ativo`, `google_business_ativo`) continuam como `text` (compat Make) e o frontend já normaliza.

### Mapa final por plataforma (banco ↔ Make)

| Plataforma       | Flag de ativação            | Colunas técnicas lidas pelo Make                  |
| ---------------- | --------------------------- | ------------------------------------------------- |
| Google Ads       | `google_ads_ativo`          | `google_ads_customer_id`                          |
| Meta Ads         | `meta_ativo`                | `meta_ad_account_id`, `meta_pixel_id`             |
| Instagram        | `instagram_ativo`           | `instagram_business_account_id`                   |
| GA4              | `ga4_ativo`                 | `ga4_property_id`                                 |
| Google Business  | `google_business_ativo`     | `google_business_location_id`                     |
| TikTok Ads       | `tiktok_ativo` (novo)       | `tiktok_ad_account_id`                            |

Tudo opcional. Cenário Make padrão:
`Search Rows em cadastro_clientes WHERE ativo = true AND <flag>=true AND <id_col> IS NOT NULL` → Iterator → grava em `base_metricas` usando `nome_cliente`.

---

## 2. Estrutura final da interface

### 2.1 Tela de **criação** (`/admin/clientes/novo`)

Fluxo "cadastro rápido" + opção de já configurar tudo numa só operação.

```text
┌─ Novo cliente ───────────────────────────────────────┐
│                                                      │
│ Identidade & contato                                 │
│   Nome do cliente *        Empresa                   │
│   E-mail                   Telefone                  │
│                                                      │
│   [ + Mostrar configurações avançadas ▾ ]            │
│                                                      │
│   ─── (expandido) ──────────────────────────────     │
│   Slug avançado                                      │
│     Slug (URL)  ← auto-gerado a partir do nome       │
│                                                      │
│   Comercial                                          │
│     Data início   Valor mensal   mLabs URL           │
│     Observações                                      │
│                                                      │
│   Plataformas ativas (toggles)                       │
│     Google Ads · Meta Ads · Instagram · GA4 ·        │
│     Google Business · TikTok Ads                     │
│                                                      │
│   Integrações  (cards modulares — ver §2.3)          │
│     [Google Ads] [Meta Ads] [Instagram] [GA4]        │
│     [Google Business] [TikTok Ads]                   │
│   ──────────────────────────────────────────────     │
│                                                      │
│              [Cancelar]   [Criar cliente]            │
└──────────────────────────────────────────────────────┘
```

Comportamento:
- Bloco superior (Identidade & contato) sempre visível.
- Botão "Mostrar configurações avançadas" expande Slug + Comercial + Plataformas + Integrações na mesma página, sem redirect.
- Slug auto-gerado a partir do Nome; campo só editável dentro do bloco Avançado.
- Salvar grava tudo em uma única chamada `createCliente`. Após salvar, vai para `/admin/clientes/$id`.

### 2.2 Tela de **edição** (`/admin/clientes/$id`)

Seções colapsáveis, na ordem definitiva:

```text
[Header: nome + StatusBadge + Desativar/Reativar]

01 Identidade               Nome · Empresa · (▸ Avançado: Slug)
02 Contato                  E-mail · Telefone
03 Comercial                Data início · Valor mensal · mLabs URL · Observações
04 Plataformas ativas       6 toggles (Google Ads, Meta, IG, GA4, GBP, TikTok)
05 Integrações              6 cards modulares (ver §2.3)
06 Serviços contratados     (sem mudança)
07 Acessos                  (sem mudança)
```

### 2.3 Seção **Integrações** — layout modular

Grid de cards independentes, um por plataforma, todos com o mesmo molde. Adicionar uma nova plataforma no futuro = **um novo card no array**, zero refactor de layout.

```text
┌──────────────────────────────────────────────────────┐
│ 05  Integrações                          5 / 6 ok    │
│ Identificadores consumidos pelos cenários do Make.   │
├──────────────────────────────────────────────────────┤
│ ┌────────────────────────┐ ┌────────────────────────┐│
│ │ ▣ Google Ads     🟢    │ │ ▣ Meta Ads        🟡    ││
│ │ Configurado            │ │ Parcialmente config.   ││
│ │                        │ │                        ││
│ │ Customer ID            │ │ Ad Account ID          ││
│ │ [ 123-456-7890       ] │ │ [ act_123…           ] ││
│ │                        │ │ Pixel ID               ││
│ │                        │ │ [                    ] ││
│ └────────────────────────┘ └────────────────────────┘│
│ ┌────────────────────────┐ ┌────────────────────────┐│
│ │ ▣ Instagram      🔵    │ │ ▣ GA4             ⚪    ││
│ │ Pré-configurado        │ │ Não configurado        ││
│ │ ...                    │ │ ...                    ││
│ └────────────────────────┘ └────────────────────────┘│
│ ┌────────────────────────┐ ┌────────────────────────┐│
│ │ ▣ Google Business      │ │ ▣ TikTok Ads           ││
│ │ ...                    │ │ ...                    ││
│ └────────────────────────┘ └────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

Cada card contém:
- Ícone + nome da plataforma.
- **Pill de status** (regra abaixo).
- 1+ campos de ID (texto livre, max 200, opcionais).
- Hint inline quando faltar configurar (ex.: "Ative a plataforma para coletar dados" ou "Preencha o ID para o Make rodar").

### 2.4 Regra do indicador visual de status (Ajuste 3)

Calculado por plataforma com base em `(ativo, id_principal)`. Para Meta, `id_principal = meta_ad_account_id` (o Pixel é secundário).

| Estado                | Condição                          | Cor / Pill          |
| --------------------- | --------------------------------- | ------------------- |
| 🟢 Configurado         | ativo = true  · ID preenchido     | `success`           |
| 🟡 Parcialmente config.| ativo = true  · ID vazio          | `warning` (âmbar)   |
| 🔵 Pré-configurado     | ativo = false · ID preenchido     | `info` (azul)       |
| ⚪ Não configurado     | ativo = false · ID vazio          | `muted`             |

Componente novo reutilizável: `src/components/lotus/IntegrationStatusPill.tsx`. Toda a seção Integrações também mostra um contador agregado no header (`5 / 6 ok` = quantos cards em verde).

### 2.5 Preparação para crescimento (Ajuste 4)

A seção Integrações é renderizada a partir de um array declarativo:

```ts
// src/lib/integrations-catalog.ts
export const INTEGRATIONS = [
  { key: 'google_ads',  label: 'Google Ads',
    activeField: 'google_ads_ativo',
    fields: [{ col: 'google_ads_customer_id', label: 'Customer ID', primary: true }] },
  { key: 'meta',        label: 'Meta Ads',
    activeField: 'meta_ativo',
    fields: [
      { col: 'meta_ad_account_id', label: 'Ad Account ID', primary: true },
      { col: 'meta_pixel_id',      label: 'Pixel ID' },
    ] },
  { key: 'instagram',   label: 'Instagram',
    activeField: 'instagram_ativo',
    fields: [{ col: 'instagram_business_account_id', label: 'Instagram Business Account ID', primary: true }] },
  { key: 'ga4',         label: 'Google Analytics 4',
    activeField: 'ga4_ativo',
    fields: [{ col: 'ga4_property_id', label: 'Property ID', primary: true }] },
  { key: 'gbp',         label: 'Google Business',
    activeField: 'google_business_ativo',
    fields: [{ col: 'google_business_location_id', label: 'Location ID', primary: true }] },
  { key: 'tiktok',      label: 'TikTok Ads',
    activeField: 'tiktok_ativo',
    fields: [{ col: 'tiktok_ad_account_id', label: 'Ad Account ID', primary: true }] },
] as const;
```

Adicionar LinkedIn, YouTube, Search Console, Microsoft Ads, RD Station ou HubSpot no futuro = uma migration aditiva (`ADD COLUMN`) + uma entrada nesse array. Sem mudar a tela.

---

## 3. Arquivos que serão alterados/criados

**Banco**
- `supabase/migrations-official/04_integracoes_make.sql` (novo)

**Frontend**
- `src/lib/integrations-catalog.ts` (novo — array declarativo)
- `src/components/lotus/IntegrationStatusPill.tsx` (novo)
- `src/components/lotus/IntegrationCard.tsx` (novo — molde do card)
- `src/lib/admin.functions.ts` — Zod + selects incluem as 6 colunas novas e `tiktok_ativo`
- `src/routes/_authenticated/admin/clientes.$id.tsx` — nova seção 05 Integrações, Slug movido para "Avançado" em Identidade, toggle TikTok adicionado
- `src/routes/_authenticated/admin/clientes.novo.tsx` — refeito com "cadastro rápido + Mostrar configurações avançadas"

**Não tocados:** `base_metricas`, views analíticas, dashboards, `/cliente/$cliente`, cenários Make, RLS, policies.

---

## 4. Checklist final

- Migration: 6 novas colunas (`google_ads_customer_id`, `meta_ad_account_id`, `meta_pixel_id`, `instagram_business_account_id`, `ga4_property_id`, `tiktok_ad_account_id`) + 1 flag (`tiktok_ativo`) + refresh de `vw_clientes_admin`.
- Cadastro rápido com expansor "Mostrar configurações avançadas" cobrindo Slug, Comercial, Plataformas e Integrações.
- Status pill 🟢🟡🔵⚪ em cada card + contador agregado.
- Layout 100% data-driven a partir de `INTEGRATIONS`.
- Make pode ler tudo direto de `cadastro_clientes` sem hardcode.

Aprove para eu rodar a migration e refatorar o cadastro, ou aponte ajustes finais.
