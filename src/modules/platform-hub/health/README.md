# health

**Responsabilidade:** observabilidade de conexões via sinais — sem Runtime.

**Implementa:** `HealthEngine`, `HealthSignalStore`, evaluators compostos — Fase 5 ✅.

**Dependentes:** EventBus (F6, emitirá `accept()`), rotas admin (futuro).

```
Signal → SignalStore → HealthEngine → Evaluators → Snapshot → Repository
```

O Runtime **nunca** calcula Health — apenas produz fatos.
