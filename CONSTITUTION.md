# CONSTITUTION — Platform Hub v3.3

> **Status:** Architecture Frozen (2026-07-07)
>
> Este documento define regras **constitucionais** do Platform Hub. Violações são bloqueadas
> por Architecture Validation (Fase -1+). Compatibilidade evolutiva de contratos é validada por
> `validate:contracts` — não faz parte desta constituição.

## Regras constitucionais

| #   | Regra                                                                                    |
| --- | ---------------------------------------------------------------------------------------- |
| 1   | SDK externo somente em `src/modules/platform-hub/` e `src/modules/platform-hub-bridges/` |
| 2   | Provider acessado somente via Adapter do plugin                                          |
| 3   | Roteamento por Capability namespaced — nunca por PlatformKey                             |
| 4   | Runtime usa ConnectionId — ScopeRef só no ConnectionResolver e bridge legado             |
| 5   | Manifest é fonte de metadata; adapter e providers são código manual                      |
| 6   | Health: eventos `integration.*` primários + reconciliação periódica (contrato)           |
| 7   | Runtime não conhece UI, dashboard ou cadastro                                            |
| 8   | Escrita de métricas somente via MetricWriterPort                                         |
| 9   | Plugin não importa outro plugin                                                          |
| 10  | Emenda constitucional exige ADR aceito + atualização de validators                       |

## Processo de emenda

1. Redigir ADR com contexto, decisão, alternativas e consequências.
2. Obter aceite formal (revisão de engenharia).
3. Atualizar `CONSTITUTION.md` e validators em `scripts/architecture-validation/`.
4. Se a emenda alterar schemas, versionar contratos em `contracts/` com `contract.meta.json`.

Emendas **não** exigem unanimidade; exigem ADR aceito e validators atualizados.

## Relação com outros artefatos

| Artefato                    | Função                                 |
| --------------------------- | -------------------------------------- |
| **CONSTITUTION**            | Proíbe (regras invioláveis sem emenda) |
| **ADR**                     | Explica o porquê de decisões           |
| **contracts/**              | Define e versiona schemas              |
| **Architecture Validation** | Enforce no CI (`npm run check`)        |

## Referências

- Arquitetura congelada: Platform Hub v3.3
- Engineering Contracts: [`docs/02-architecture/engineering-contracts.md`](docs/02-architecture/engineering-contracts.md)
- ADR: [`docs/02-architecture/adr/0020-engineering-contracts-platform-hub.md`](docs/02-architecture/adr/0020-engineering-contracts-platform-hub.md)
