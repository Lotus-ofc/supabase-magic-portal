# Contribuindo com a Lotus

Obrigado por contribuir. A Lotus trata **documentação como produto** e **engenharia como sistema**.

## Antes de começar

1. Leia **[docs/START_HERE.md](docs/START_HERE.md)** (~1h)
2. Configure o ambiente: **[SETUP.md](SETUP.md)** · `npm run setup` · [Onboarding](docs/10-onboarding/onboarding.md)
3. Entenda o fluxo oficial: [development-workflow](docs/09-standards/development-workflow.md)

## Fluxo de trabalho

```
Cursor (dev local) → branch → PR → CI → review → merge → deploy
```

1. Crie uma branch descritiva a partir de `main`
2. Implemente com o menor diff possível
3. Rode `npm run check` antes de abrir PR
4. Atualize `docs/` no mesmo PR se comportamento mudou
5. Use o [template de PR](.github/pull_request_template.md)

## O que esperamos

| Princípio                      | Referência                      |
| ------------------------------ | ------------------------------- |
| Fonte única de verdade         | `src/lib/platforms/formulas.ts` |
| Engine declarativo             | `PlatformDef` + registry        |
| Segurança em camadas           | RLS + server functions + Zod    |
| Docs-as-code                   | `docs/` + `.cursor/rules/`      |
| ADRs para decisões estruturais | `docs/02-architecture/adr/`     |

## Comandos úteis

```bash
npm run dev              # desenvolvimento
npm run check            # lint + test + build + validate
npm run validate:engineering  # artefatos de governança
npm run test:watch       # testes em watch
npm run format           # Prettier (LF)
```

## Commits

- Mensagens claras, foco no **porquê**
- Um PR por assunto — pequeno e revisável
- Não reescrever histórico publicado (ver `AGENTS.md`)

## Governança

- [Sistema de Engenharia](docs/00-company/engineering-system.md)
- [Governança](docs/09-standards/governance.md)
- [Auditoria de completude](docs/AUDIT.md)

## Dúvidas

> ⚠️ Canais do time não documentados no repositório — pergunte ao maintainer do projeto.
