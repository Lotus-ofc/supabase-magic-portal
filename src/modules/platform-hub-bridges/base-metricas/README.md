# base-metricas bridge

**Responsabilidade:** escrita real em `base_metricas` via Supabase (Passive Production Integration).

**Implementa:** `SupabaseBaseMetricasWriter`, `SupabaseBaseMetricasInsertAdapter`.

**Feature flag:** `PLATFORM_HUB_SUPABASE_WRITER=true` — desligado por padrão.

**Fora do kernel:** vive em `platform-hub-bridges/` para respeitar hub boundaries (sem `@/integrations/supabase` em `platform-hub/`).
