# connections

**Responsabilidade:** gestão de conexões (`ConnectionService`), resolução (`ConnectionResolver`) e credenciais (`CredentialVaultPort`).

**Implementa:** `ConnectionService`, `InMemoryConnectionRepository`, `InMemoryCredentialVault` — Fase 4 ✅.

**Dependentes:** `identity/` (attach), `runtime/` (F6), `metric-pipeline/` (F6).

O `ConnectionService` é coordenador — não chama APIs nem `provider.collect()`.
