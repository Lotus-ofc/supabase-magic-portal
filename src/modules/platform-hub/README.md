# Platform Hub

Infraestrutura universal de integração da Lots BI (**v3.3 — Architecture Frozen**).

## Status (2026-07-08)

| Área                                                     | Estado     |
| -------------------------------------------------------- | ---------- |
| Contratos / Constituição / Governance                    | ✅         |
| Hub Registry + 7 plugins                                 | ✅         |
| Connections / Identity / CredentialVault (in-memory)     | ✅         |
| Health Engine + reconcile                                | ✅         |
| Sync Runtime + Metric Pipeline                           | ✅         |
| OfficialMetaProvider + OAuth service (sem callback HTTP) | ✅         |
| Baseline Reader / Comparison (bridge)                    | ✅         |
| Writers memory + Supabase (flag)                         | ✅         |
| Persistência `ph_*` / UI `/admin/conexoes`               | ❌ adiado  |
| Official providers TikTok→GA4                            | ❌ stubs   |
| Publisher Runtime / Make removido                        | ❌ roadmap |

## Uso

```ts
import { createPlatformHubStack } from "@/modules/platform-hub/public";

const hub = createPlatformHubStack();
const result = await hub.syncRuntime.execute(connectionId);
await hub.metricPipeline.accept(result.envelope!);
```

## Mapa do módulo

```
platform-hub/
├── ports/              Contracts → TypeScript ports
├── registry/           Hub Registry + PluginLoader
├── plugins/            example + 6 marketing (+ Meta official)
├── connections/        ConnectionService + CredentialVault
├── identity/           PlatformIdentity
├── metric-pipeline/    IngestEnvelope → MetricWriterPort
├── runtime/            SyncRuntime
├── health/             HealthEngine (eventos + reconcile)
├── events/             integration.* (in-memory bus)
├── observability/      spans + sync runs
├── bootstrap.ts        createPlatformHubStack()
└── public/             API pública
```

**Bridges (fora do kernel):**

- `platform-hub-bridges/legacy-cadastro/`
- `platform-hub-bridges/base-metricas/` (writer)
- `platform-hub-bridges/base-metricas-reader/` (baseline + comparison)

## Fluxo

```
Plugin → HubRegistry → Adapter → Provider → IngestEnvelope
                                              ↓
                         MetricPipeline → MetricWriterPort → base_metricas*
```

\*MemoryWriter default; SupabaseWriter com `PLATFORM_HUB_SUPABASE_WRITER=true`.

**Produção Lots BI hoje (intocado):** Make → Supabase → `base_metricas` → dashboards.

## Comandos DX

```bash
npm run create:plugin
npm run generate:plugin -- <key>
npm run validate:plugin
npm run hub:doctor
npm run check
```

## Referências

- Constituição: [`CONSTITUTION.md`](../../../CONSTITUTION.md)
- Contratos: [`contracts/`](../../../contracts/)
- Engineering Contracts: [`docs/02-architecture/engineering-contracts.md`](../../../docs/02-architecture/engineering-contracts.md)
- ADRs: 0020–0024 em `docs/02-architecture/adr/`
