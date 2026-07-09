# base-metricas-reader bridge

**Responsabilidade:** leitura somente de `base_metricas` (baseline Make) e comparação com output do MetricPipeline.

**Fora do kernel:** vive em `platform-hub-bridges/` — sem alterar Runtime, Pipeline, Writer ou contratos.

## Uso

```ts
import {
  createBaselineReader,
  InMemoryBaselineMetricasQuery,
  compareAgainstBaseline,
} from "@/modules/platform-hub-bridges/base-metricas-reader";

const baselineReader = createBaselineReader({
  queryPort: new InMemoryBaselineMetricasQuery(makeRows),
  source: "memory",
});

const report = await compareAgainstBaseline({
  baselineReader,
  filter: {
    cliente: "acme_corp",
    plataforma: "Meta Ads",
    from: "2026-07-01",
    to: "2026-07-07",
  },
  produced: pipeline.writer.snapshot(),
});

// report.compatible, report.coverage, report.summary
```

## Produção (Supabase read-only)

```ts
const baselineReader = createBaselineReader(); // SupabaseBaselineMetricasQuery
const baseline = await baselineReader.read({ ... });
```

## Não faz

- escrever em `base_metricas`
- chamar Provider / Runtime / OAuth
- alterar normalizers do Pipeline
