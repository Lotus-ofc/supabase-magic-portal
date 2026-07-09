# platform-hub-bridges

**Responsabilidade:** módulo separado para código que toca legado, Supabase e SDKs externos.

**Implementa:**

- `legacy-cadastro/` — bridge cadastro_clientes (Fase 3+)
- `base-metricas/` — SupabaseWriter para Passive Production Integration

**Dependentes:** Platform Hub via factories (`createPlatformHubStack`, `createConnectionStack`).

O Hub importa apenas **ports** ou factories deste módulo — nunca `cadastro_clientes` diretamente no kernel.
