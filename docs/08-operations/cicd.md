---
title: CI/CD
description: Pipeline de integração e deploy — estado atual e especificação alvo.
status: living
owner: Engenharia / Ops Lotus
last_review: 2026-06-26
---

# CI/CD

---

## Estado atual

| Item | Status |
|------|--------|
| GitHub Actions | ❌ Não existe (`.github/workflows/` ausente) |
| Deploy automático | ❌ Manual via Lovable (transitório) |
| Migrations automáticas | ❌ Manual no Supabase dashboard |
| Lint no PR | ❌ Não enforced |
| Testes no PR | ❌ Suite inexistente |

---

## Pipeline alvo (especificação)

```mermaid
flowchart LR
    PR["Pull Request"] --> LINT["lint"]
    LINT --> BUILD["build"]
    BUILD --> TEST["test"]
    TEST --> MERGE["merge main"]
    MERGE --> DEPLOY["deploy production"]
    DEPLOY --> MIG["migrations (manual gate)"]
```

### Job: `ci` (em todo PR)

```yaml
# Especificação — não implementado ainda
steps:
  - checkout
  - setup-node (LTS)
  - npm ci
  - npm run lint
  - npm run build
  # - npm test (quando existir)
```

### Job: `deploy` (push em `main`)

```yaml
steps:
  - build (Nitro/Cloudflare)
  - deploy com secrets:
      OFFICIAL_SUPABASE_URL
      OFFICIAL_SUPABASE_ANON_KEY
      OFFICIAL_SERVICE_ROLE_KEY
      VITE_OFFICIAL_*
```

### Migrations

Gate manual: aplicar `supabase/migrations-official/*.sql` no projeto Supabase **antes** ou
**depois** do deploy conforme compatibilidade. Documentar ordem no PR.

---

## Transição Lovable → CI proprietário

| Fase | Ação |
|------|------|
| 1 | GitHub Actions: lint + build em PR |
| 2 | Deploy preview (branch) |
| 3 | Deploy prod Cloudflare via Action |
| 4 | Remover dependência deploy Lovable |
| 5 | Remover `@lovable.dev/vite-tanstack-config` |

Ver [ADR-0009](../02-architecture/adr/0009-platform-proprietary-infrastructure.md),
[ADR-0010](../02-architecture/adr/0010-cursor-official-development-environment.md).

---

## Checklist de PR (automação futura)

- [ ] `docs/` atualizado se comportamento mudou
- [ ] `npm run lint` passa
- [ ] `npm run build` passa
- [ ] Changelog se visível ao usuário
- [ ] ADR se decisão estrutural

---

## Dívida de lint (Windows)

`npm run lint` pode falhar por CRLF vs LF (Prettier). Corrigir com `npm run format` +
`.gitattributes` (`* text=auto eol=lf`) em PR dedicado.

---

## Referências

- [Deployment](./deployment.md)
- [Ambientes](./environments.md)
- [Testing](../09-standards/testing.md)
