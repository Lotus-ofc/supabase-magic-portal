# identity

**Responsabilidade:** CRUD de `PlatformIdentity` por conexão (Business, Ad Account, Page, Instagram…).

**Implementa:** `IdentityService`, `InMemoryIdentityRepository` — Fase 4 ✅.

**Dependentes:** `ConnectionService` (validação via manifest do plugin), providers (F3+ collect).

Validação de `identityType` via `HubRegistry` — sem `if (plugin === "meta")`.
