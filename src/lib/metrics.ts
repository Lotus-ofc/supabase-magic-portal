// ============================================================================
// Lotus · camada única de normalização e agregação de métricas.
// Toda lógica de KPIs / deltas / séries diárias / agregações por plataforma
// vive aqui — para que dashboards (admin + cliente) e relatórios consumam a
// MESMA fonte de verdade, sem duplicação.
//
// Premissas:
// - Views Supabase já estão normalizadas (plataforma + métricas em snake_case).
// - Datas são strings ISO "YYYY-MM-DD" (date-only, sem timezone).
// - Valores monetários já estão em moeda (Google Ads cost_micros é convertido
//   na própria view vw_metricas_normalizadas).
// ============================================================================

export type Platform =
  | "meta_ads"
  | "google_ads"
  | "ga4"
  | "instagram"
  | "google_business"
  | "tiktok";

export const PLATFORM_LABEL: Record<Platform, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  ga4: "Google Analytics 4",
  instagram: "Instagram",
  google_business: "Google Business",
  tiktok: "TikTok",
};

/** Famílias de canais — usado para agrupar visualmente. */
export const PLATFORM_FAMILY: Record<Platform, "paid" | "organic" | "analytics"> = {
  meta_ads: "paid",
  google_ads: "paid",
  instagram: "organic",
  google_business: "organic",
  tiktok: "paid",
  ga4: "analytics",
};

// ----------------------------------------------------------------------------
// Métricas comuns — modelo canônico independente da plataforma.
// ----------------------------------------------------------------------------
export type CommonMetric =
  | "spend"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "cpm"
  | "reach"
  | "engagement"
  | "sessions"
  | "conversions"
  | "leads";

export interface MetricMeta {
  label: string;
  short: string;
  /** Formato de display. */
  format: "currency" | "int" | "decimal" | "percent";
  /** true = subir é bom; false = subir é ruim (ex.: CPC). */
  positiveIsGood: boolean;
  /** Família visual usada para escolher cor do chart. */
  tone: "primary" | "secondary" | "neutral" | "success" | "warning";
}

export const METRIC_META: Record<CommonMetric, MetricMeta> = {
  spend:       { label: "Investimento",      short: "Invest.",  format: "currency", positiveIsGood: true,  tone: "primary"   },
  impressions: { label: "Impressões",        short: "Impr.",    format: "int",      positiveIsGood: true,  tone: "secondary" },
  clicks:      { label: "Cliques",           short: "Cliques",  format: "int",      positiveIsGood: true,  tone: "secondary" },
  ctr:         { label: "CTR",               short: "CTR",      format: "percent",  positiveIsGood: true,  tone: "neutral"   },
  cpc:         { label: "CPC médio",         short: "CPC",      format: "currency", positiveIsGood: false, tone: "warning"   },
  cpm:         { label: "CPM médio",         short: "CPM",      format: "currency", positiveIsGood: false, tone: "warning"   },
  reach:       { label: "Alcance",           short: "Alcance",  format: "int",      positiveIsGood: true,  tone: "secondary" },
  engagement:  { label: "Engajamento",       short: "Engaj.",   format: "int",      positiveIsGood: true,  tone: "primary"   },
  sessions:    { label: "Sessões",           short: "Sessões",  format: "int",      positiveIsGood: true,  tone: "secondary" },
  conversions: { label: "Conversões",        short: "Conv.",    format: "int",      positiveIsGood: true,  tone: "success"   },
  leads:       { label: "Leads",             short: "Leads",    format: "int",      positiveIsGood: true,  tone: "success"   },
};

// ----------------------------------------------------------------------------
// Formatadores — sempre em pt-BR / BRL.
// ----------------------------------------------------------------------------
const _intFmt    = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const _decFmt    = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const _brlFmt    = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const _brlCenFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

export function formatMetric(metric: CommonMetric, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const meta = METRIC_META[metric];
  switch (meta.format) {
    case "currency":
      return value < 100 ? _brlCenFmt.format(value) : _brlFmt.format(value);
    case "percent":
      return `${value.toFixed(2)}%`;
    case "decimal":
      return _decFmt.format(value);
    case "int":
    default:
      return _intFmt.format(Math.round(value));
  }
}

/** Versão compacta para eixos / tooltips. */
export function formatCompact(metric: CommonMetric, value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const meta = METRIC_META[metric];
  if (meta.format === "currency") {
    if (abs >= 1_000_000) return `R$${(value / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `R$${Math.round(value / 1_000)}k`;
    return `R$${Math.round(value)}`;
  }
  if (meta.format === "percent") return `${value.toFixed(1)}%`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return _intFmt.format(Math.round(value));
}

/** Display curto para datas no eixo X. */
export function formatDay(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function formatDayLong(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

// ----------------------------------------------------------------------------
// Janela de período (atual + comparativo anterior).
// ----------------------------------------------------------------------------
export interface PeriodRange {
  days: number;
  /** Inclusive — primeira data do período atual. */
  from: string;
  /** Inclusive — última data do período atual (hoje). */
  to: string;
  /** Inclusive — primeira data do período anterior (para delta). */
  prevFrom: string;
  /** Inclusive — última data do período anterior. */
  prevTo: string;
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function periodRange(days: number, today: Date = new Date()): PeriodRange {
  const to = new Date(today);
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  const prevTo = new Date(from);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - (days - 1));
  return {
    days,
    from: isoDay(from),
    to: isoDay(to),
    prevFrom: isoDay(prevFrom),
    prevTo: isoDay(prevTo),
  };
}

// ----------------------------------------------------------------------------
// Tipos da view vw_overview_cliente (uma linha por cliente / dia).
// ----------------------------------------------------------------------------
export interface OverviewRow {
  data: string;
  cliente: string;
  meta_spend: number | null;
  google_spend: number | null;
  total_impressions: number | null;
  total_clicks: number | null;
  ga4_sessions: number | null;
  ga4_conversions: number | null;
  instagram_reach: number | null;
  instagram_interactions: number | null;
}

export interface Totals {
  spend: number;
  meta_spend: number;
  google_spend: number;
  impressions: number;
  clicks: number;
  sessions: number;
  conversions: number;
  reach: number;
  engagement: number;
}

const ZERO_TOTALS: Totals = {
  spend: 0, meta_spend: 0, google_spend: 0,
  impressions: 0, clicks: 0, sessions: 0,
  conversions: 0, reach: 0, engagement: 0,
};

export function sumOverview(rows: OverviewRow[]): Totals {
  return rows.reduce((acc, r) => {
    const meta = r.meta_spend ?? 0;
    const google = r.google_spend ?? 0;
    acc.meta_spend += meta;
    acc.google_spend += google;
    acc.spend += meta + google;
    acc.impressions += r.total_impressions ?? 0;
    acc.clicks += r.total_clicks ?? 0;
    acc.sessions += r.ga4_sessions ?? 0;
    acc.conversions += r.ga4_conversions ?? 0;
    acc.reach += r.instagram_reach ?? 0;
    acc.engagement += r.instagram_interactions ?? 0;
    return acc;
  }, { ...ZERO_TOTALS });
}

/** Variação percentual segura — null quando não há base. */
export function pctDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous <= 0 && current <= 0) return null;
  if (previous <= 0) return 100;
  return ((current - previous) / previous) * 100;
}

/** CTR derivado em pontos percentuais (0–100). */
export function deriveCtr(impressions: number, clicks: number): number {
  return impressions > 0 ? (clicks / impressions) * 100 : 0;
}

/** Taxa de conversão sobre sessões (0–100). */
export function deriveConvRate(sessions: number, conversions: number): number {
  return sessions > 0 ? (conversions / sessions) * 100 : 0;
}

/** CPA — custo por conversão. */
export function deriveCpa(spend: number, conversions: number): number {
  return conversions > 0 ? spend / conversions : 0;
}

// ----------------------------------------------------------------------------
// Séries diárias — formato consumido por AreaChartLotus.
// ----------------------------------------------------------------------------
export interface DailyPoint {
  date: string;
  meta_spend: number;
  google_spend: number;
  spend: number;
  conversions: number;
  sessions: number;
  clicks: number;
  impressions: number;
  reach: number;
  engagement: number;
}

/**
 * Agrupa OverviewRows por data, somando todos os clientes.
 * Preenche dias faltantes com zeros para garantir continuidade no chart.
 */
export function dailyFromOverview(
  rows: OverviewRow[],
  period: PeriodRange,
): DailyPoint[] {
  const byDate = new Map<string, DailyPoint>();
  for (const r of rows) {
    if (r.data < period.from || r.data > period.to) continue;
    const cur = byDate.get(r.data) ?? emptyPoint(r.data);
    cur.meta_spend += r.meta_spend ?? 0;
    cur.google_spend += r.google_spend ?? 0;
    cur.spend = cur.meta_spend + cur.google_spend;
    cur.conversions += r.ga4_conversions ?? 0;
    cur.sessions += r.ga4_sessions ?? 0;
    cur.clicks += r.total_clicks ?? 0;
    cur.impressions += r.total_impressions ?? 0;
    cur.reach += r.instagram_reach ?? 0;
    cur.engagement += r.instagram_interactions ?? 0;
    byDate.set(r.data, cur);
  }
  // Preenche dias faltantes
  const out: DailyPoint[] = [];
  const cur = new Date(period.from + "T00:00:00");
  const end = new Date(period.to + "T00:00:00");
  while (cur <= end) {
    const k = isoDay(cur);
    out.push(byDate.get(k) ?? emptyPoint(k));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

function emptyPoint(date: string): DailyPoint {
  return {
    date,
    meta_spend: 0, google_spend: 0, spend: 0,
    conversions: 0, sessions: 0, clicks: 0,
    impressions: 0, reach: 0, engagement: 0,
  };
}

// ----------------------------------------------------------------------------
// Agregação por cliente — usada em "Top clientes" do admin executivo.
// ----------------------------------------------------------------------------
export interface ClientAggregate {
  cliente: string;
  totals: Totals;
  ctr: number;
  cpa: number;
}

export function aggregateByCliente(rows: OverviewRow[]): ClientAggregate[] {
  const byCli = new Map<string, OverviewRow[]>();
  for (const r of rows) {
    const arr = byCli.get(r.cliente) ?? [];
    arr.push(r);
    byCli.set(r.cliente, arr);
  }
  return Array.from(byCli.entries()).map(([cliente, rows]) => {
    const totals = sumOverview(rows);
    return {
      cliente,
      totals,
      ctr: deriveCtr(totals.impressions, totals.clicks),
      cpa: deriveCpa(totals.spend, totals.conversions),
    };
  });
}

// ----------------------------------------------------------------------------
// Distribuição por plataforma — para BarChart / DonutChart.
// Considera SOMENTE plataformas pagas (spend) já que é a métrica monetária
// comum. Outras dimensões (alcance/sessões) viram cards próprios.
// ----------------------------------------------------------------------------
export interface PlatformShare {
  platform: Platform;
  label: string;
  value: number;
  share: number; // 0–1
}

export function spendShareByPlatform(rows: OverviewRow[]): PlatformShare[] {
  const t = sumOverview(rows);
  const items: Array<{ p: Platform; v: number }> = [
    { p: "meta_ads", v: t.meta_spend },
    { p: "google_ads", v: t.google_spend },
  ];
  const total = items.reduce((s, i) => s + i.v, 0);
  return items
    .filter((i) => i.v > 0)
    .map((i) => ({
      platform: i.p,
      label: PLATFORM_LABEL[i.p],
      value: i.v,
      share: total > 0 ? i.v / total : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

// ----------------------------------------------------------------------------
// Insights automáticos — regras simples, sem invenção.
// ----------------------------------------------------------------------------
export interface Insight {
  id: string;
  title: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
}

export function buildInsights(args: {
  current: Totals;
  previous: Totals;
  days: number;
}): Insight[] {
  const { current, previous, days } = args;
  const out: Insight[] = [];

  const spendD = pctDelta(current.spend, previous.spend);
  const convD  = pctDelta(current.conversions, previous.conversions);
  const sessD  = pctDelta(current.sessions, previous.sessions);
  const ctr    = deriveCtr(current.impressions, current.clicks);
  const cpa    = deriveCpa(current.spend, current.conversions);

  if (convD != null && Math.abs(convD) >= 5) {
    const up = convD > 0;
    out.push({
      id: "conv-delta",
      title: `Conversões ${up ? "subiram" : "recuaram"} ${Math.abs(convD).toFixed(1)}%`,
      detail: `Comparado aos ${days} dias anteriores. ${
        up ? "Mantenha o ritmo da campanha vencedora." : "Vale revisar criativos e segmentação."
      }`,
      tone: up ? "positive" : "negative",
    });
  }

  if (spendD != null && Math.abs(spendD) >= 8) {
    const up = spendD > 0;
    out.push({
      id: "spend-delta",
      title: `Investimento ${up ? "aumentou" : "caiu"} ${Math.abs(spendD).toFixed(1)}%`,
      detail: up
        ? "O ritmo de mídia acelerou no período. Confirme se o retorno acompanha."
        : "O ritmo de mídia diminuiu. Avalie pacing ou pausas programadas.",
      tone: "neutral",
    });
  }

  if (current.impressions > 0) {
    const good = ctr >= 1.5;
    out.push({
      id: "ctr",
      title: `CTR médio em ${ctr.toFixed(2)}%`,
      detail: good
        ? "Sinal saudável de aderência criativo-público."
        : "Abaixo da média saudável (1,5%). Teste novos criativos.",
      tone: good ? "positive" : "neutral",
    });
  }

  if (cpa > 0 && current.conversions >= 5) {
    out.push({
      id: "cpa",
      title: `Custo por conversão em ${formatMetric("spend", cpa)}`,
      detail: `Base: ${current.conversions} conversões nos últimos ${days} dias.`,
      tone: "neutral",
    });
  }

  if (sessD != null && Math.abs(sessD) >= 10) {
    const up = sessD > 0;
    out.push({
      id: "sess-delta",
      title: `Tráfego ${up ? "cresceu" : "caiu"} ${Math.abs(sessD).toFixed(1)}%`,
      detail: "Variação de sessões GA4 em relação ao período anterior.",
      tone: up ? "positive" : "negative",
    });
  }

  return out.slice(0, 5);
}
