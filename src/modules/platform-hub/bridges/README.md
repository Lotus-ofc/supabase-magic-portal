# bridges

**Responsabilidade:** contrato de isolamento entre o Hub e o legado (`cadastro_clientes`).

**Implementa:** `LegacyCadastroBridgePort` — impl em `platform-hub-bridges/` (Fase 3 ✅).

**Dependentes:** `connections/` (único consumidor interno).

```
Platform Hub (connections/)
        │
   bridges/  ← port
        │
platform-hub-bridges/legacy-cadastro/
        │
cadastro_clientes
```
