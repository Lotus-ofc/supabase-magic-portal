// ============================================================================
// Lotus · Meta Ads — PlatformDef.
// View: public.vw_meta_ads_diario
// Colunas: data, cliente, campanha, reach, impressions, clicks, cpc, cpm, ctr,
//          frequency, spend.
// Conversões não estão materializadas na view — CPA/ConvRate só serão expostos
// quando uma nova MetricDef for adicionada (sem refactor).
// ============================================================================

import {
  Facebook,
  DollarSign,
  MousePointerClick,
  Eye,
  Users,
  Target,
  Activity,
  Sparkles,
} from "lucide-react";
import type { PlatformDef } from "./types";
import * as f from "./formulas";

export const metaAdsDef: PlatformDef = {
  key: "meta_ads",
  label: "Meta Ads",
  icon: Facebook,
  view: "vw_meta_ads_diario",
  campaignField: "campanha",
  description:
    "Performance da conta Meta Ads — investimento, alcance, frequência e eficiência por campanha.",
  questions: [
    "Quanto eu investi no período?",
    "Quantas pessoas únicas eu alcancei?",
    "Quantas vezes em média cada pessoa viu meus anúncios?",
    "Qual foi o CTR e o custo por clique?",
    "Qual campanha teve melhor desempenho?",
    "Como tudo evoluiu vs o período anterior?",
  ],
  metrics: [
    {
      key: "spend",
      column: "spend",
      label: "Investimento",
      format: "currency",
      aggregation: { kind: "sum" },
      icon: DollarSign,
      positiveIsGood: true,
      description: "Somatório do gasto declarado pela Meta.",
    },
    {
      key: "reach",
      column: "reach",
      label: "Alcance",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Users,
      positiveIsGood: true,
      description: "Soma do reach diário entregue pela Meta. Pessoas únicas POR DIA.",
    },
    {
      key: "impressions",
      column: "impressions",
      label: "Impressões",
      format: "int",
      aggregation: { kind: "sum" },
      icon: Eye,
      positiveIsGood: true,
      description: "Total de impressões servidas.",
    },
    {
      key: "clicks",
      column: "clicks",
      label: "Cliques",
      format: "int",
      aggregation: { kind: "sum" },
      icon: MousePointerClick,
      positiveIsGood: true,
      description: "Cliques registrados no período.",
    },
  ],
  heroMetrics: ["spend", "reach", "impressions", "clicks"],
  kpis: [
    {
      key: "ctr",
      label: "CTR",
      format: "percent",
      positiveIsGood: true,
      compute: (t) => f.ctr(t.impressions, t.clicks),
      icon: Target,
      description: "Clicks ÷ Impressions × 100.",
    },
    {
      key: "cpc",
      label: "CPC médio",
      format: "currency",
      positiveIsGood: false,
      compute: (t) => f.cpc(t.spend, t.clicks),
      icon: Activity,
      description: "Spend ÷ Clicks.",
    },
    {
      key: "cpm",
      label: "CPM médio",
      format: "currency",
      positiveIsGood: false,
      compute: (t) => f.cpm(t.spend, t.impressions),
      icon: Sparkles,
      description: "Spend ÷ Impressions × 1000.",
    },
    {
      key: "frequency",
      label: "Frequência",
      format: "decimal",
      positiveIsGood: true,
      compute: (t) => f.frequency(t.impressions, t.reach),
      description: "Impressions ÷ Reach do período.",
    },
  ],
  charts: [
    {
      key: "evolucao-investimento",
      kind: "area",
      title: "Evolução do investimento",
      description: "Gasto diário consolidado no período.",
      yMetric: "spend",
      series: [{ metric: "spend", label: "Investimento", tone: "primary" }],
      height: 260,
    },
    {
      key: "evolucao-alcance",
      kind: "area",
      title: "Alcance e impressões",
      description: "Pessoas alcançadas e impressões servidas por dia.",
      yMetric: "impressions",
      series: [
        { metric: "reach", label: "Alcance", tone: "secondary" },
        { metric: "impressions", label: "Impressões", tone: "primary" },
      ],
      height: 240,
    },
  ],
};
