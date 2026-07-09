# Gate A — Checklist de Aprovação

Marque cada item antes de declarar **Gate A GO**.

## Pré-execução

- [ ] `npm run gate-a:demo` passou localmente
- [ ] Cliente piloto escolhido via `npm run gate-a:discover`
- [ ] `canonicalClientName` conferido contra `base_metricas.cliente`
- [ ] `adAccountId` Meta conferido (formato `act_…`)
- [ ] Token Meta válido em `GATE_A_META_ACCESS_TOKEN` (não no git)
- [ ] Janela de comparação ≥ 7 dias corridos definida
- [ ] Supabase read-only configurado (`OFFICIAL_*`)

## Execução

- [ ] Config JSON criado a partir do example
- [ ] `npm run gate-a:parity -- --config=…` executado sem erro fatal
- [ ] Log `gate-a-run.jsonl` gerado
- [ ] `parity-summary.md` revisado

## Paridade

- [ ] `coverage >= 99%`
- [ ] `missingMetrics === 0` para impressions, reach, clicks, spend
- [ ] `valueDifferences` vazio (tolerância 0.0001)
- [ ] `normalizationDifferences === 0` (ou cada item documentado)
- [ ] `extraMetrics === 0` (ou aceito e documentado)
- [ ] Campanhas batem 1:1 (ou divergência documentada)
- [ ] Período completo sem buracos de data críticos

## Governança

- [ ] Nenhum dado Hub alterou dashboards de produção
- [ ] `PLATFORM_HUB_SUPABASE_WRITER` permanece **desligado**
- [ ] Relatório JSON arquivado por cliente + período
- [ ] `npm run check` verde após implementação do gate
- [ ] Engenharia + operação aprovaram relatório
- [ ] Decisão registrada: **"Meta Hub-ready para dual-run"** (Gate B)

## Não fazer neste gate

- [ ] ~~OAuth callback~~ (Gate B)
- [ ] ~~Migrations ph\_\*~~ (Gate C)
- [ ] ~~UI /admin/conexoes~~ (Gate C)
- [ ] ~~Escrita Hub em base_metricas~~ (Gate D+)

## Assinaturas

| Papel      | Nome | Data | GO / NO-GO |
| ---------- | ---- | ---- | ---------- |
| Engenharia |      |      |            |
| Operação   |      |      |            |
