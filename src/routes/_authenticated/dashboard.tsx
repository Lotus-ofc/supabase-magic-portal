import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/lotus/PageHeader";
import { StatCard } from "@/components/lotus/StatCard";
import { SectionCard } from "@/components/lotus/SectionCard";
import { EvolutionChart, type EvolutionPoint } from "@/components/lotus/EvolutionChart";
import { PeriodPicker } from "@/components/lotus/PeriodPicker";
import { resolvePeriod, addDaysISO, type PeriodInput } from "@/lib/period";
import { formatMetric, type OverviewRow } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import {
  DollarSign,
  Target,
  Activity,
  MousePointerClick,
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Compass,
  Inbox,
  Plug,
  CheckCircle2,
  Clock3,
} from "lucide-react";

type ClienteAtivo = {
  cliente: string;
  ultima_data_recebida: string | null;
  ultima_ingestao: string | null;
  plataformas_ativas: string[] | null;
  total_registros: number;
};

type Overview = OverviewRow;

const clientesQuery = queryOptions({
  queryKey: ["vw_clientes_ativos"],
  queryFn: async (): Promise<ClienteAtivo[]> => {
    const { data, error } = await supabase
      .from("vw_clientes_ativos")
      .select("*")
      .order("ultima_data_recebida", { ascending: false });
    if (error) throw error;
    return (data ?? []) as ClienteAtivo[];
  },
});

const overviewQuery = (from: string, to: string, prevFrom: string) =>
  queryOptions({
    queryKey: ["vw_overview_cliente", prevFrom, to],
    queryFn: async (): Promise<Overview[]> => {
      // Busca a janela atual + a anterior (mesmo comprimento) para o delta.
      const { data, error } = await supabase
        .from("vw_overview_cliente")
        .select("*")
        .gte("data", prevFrom)
        .lte("data", to)
        .order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Overview[];
    },
  });

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Sua conta · Lotus" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(clientesQuery);
    const p = resolvePeriod({ preset: "last_30" });
    void context.queryClient.ensureQueryData(overviewQuery(p.from, p.to, p.prevFrom));
  },
  component: ClientHome,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">
      Erro ao carregar dashboard: {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Não encontrado</div>,
});

const fmtBRL = (n: number | null | undefined) => formatMetric("spend", n);
const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : Math.round(n).toLocaleString("pt-BR");



function ClientHome() {
  const [period, setPeriod] = useState<PeriodInput>({ preset: "last_30" });
  const resolved = useMemo(() => resolvePeriod(period), [period]);

  return (
    <div className="space-y-9">
      <PageHeader
        eyebrow="Sua conta na Lotus"
        title="Resultados consolidados"
        description="Uma leitura clara do que está acontecendo nas suas plataformas — sem ruído, com contexto."
        actions={<PeriodPicker value={period} onChange={setPeriod} />}
      />

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardBody period={resolved} />
      </Suspense>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
        <div className="lotus-surface h-40 lg:col-span-3">
          <div className="lotus-skeleton m-5 h-3 w-1/3" />
          <div className="lotus-skeleton mx-5 mt-4 h-8 w-2/3" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="lotus-surface h-40">
            <div className="lotus-skeleton m-5 h-3 w-1/2" />
            <div className="lotus-skeleton mx-5 mt-4 h-6 w-2/3" />
          </div>
        ))}
      </div>
      <div className="lotus-surface h-[320px]">
        <div className="lotus-skeleton m-5 h-3 w-40" />
      </div>
    </div>
  );
}

function DashboardBody({ period }: { period: ReturnType<typeof resolvePeriod> }) {
  const { data: overview } = useSuspenseQuery(
    overviewQuery(period.from, period.to, period.prevFrom),
  );
  const { data: clientes } = useSuspenseQuery(clientesQuery);

  const current = overview.filter(
    (r) => r.data >= period.from && r.data <= period.to,
  );
  const previous = overview.filter(
    (r) => r.data >= period.prevFrom && r.data <= period.prevTo,
  );

  const totals = sumOverview(current);
  const prev = sumOverview(previous);

  const totalSpend = totals.meta + totals.google;
  const prevSpend = prev.meta + prev.google;
  const spendDelta = pctDelta(totalSpend, prevSpend);
  const convDelta = pctDelta(totals.conv, prev.conv);
  const sessionsDelta = pctDelta(totals.sessions, prev.sessions);
  const clicksDelta = pctDelta(totals.clicks, prev.clicks);

  const ctr = totals.impr > 0 ? (totals.clicks / totals.impr) * 100 : 0;
  const convRate = totals.sessions > 0 ? (totals.conv / totals.sessions) * 100 : 0;
  const cpa = totals.conv > 0 ? totalSpend / totals.conv : 0;

  const evolution = buildEvolution(current);
  const days = period.days;
  const insights = buildInsights({
    spendDelta,
    convDelta,
    sessionsDelta,
    ctr,
    convRate,
    cpa,
    totals,
    days,
  });

  const platformsActive = collectPlatforms(clientes);
  const hasAnyData = overview.length > 0;

  if (!hasAnyData && clientes.length === 0) {
    return <EmptyAccount />;
  }

  return (
    <div className="space-y-9">
      {/* HERO + secondary KPIs */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-6">
        <HeroSpend
          value={totalSpend}
          delta={spendDelta}
          google={totals.google}
          meta={totals.meta}
          days={days}
          className="lg:col-span-3"
        />
        <StatCard
          label="Conversões"
          value={fmtInt(totals.conv)}
          icon={Target}
          delta={convDelta}
          hint={`${convRate.toFixed(2)}% taxa · CPA ${cpa > 0 ? fmtBRL(cpa) : "—"}`}
        />
        <StatCard
          label="Sessões GA4"
          value={fmtInt(totals.sessions)}
          icon={Activity}
          delta={sessionsDelta}
        />
        <StatCard
          label="Cliques"
          value={fmtInt(totals.clicks)}
          icon={MousePointerClick}
          delta={clicksDelta}
          hint={`${ctr.toFixed(2)}% CTR`}
        />
      </section>

      {/* Evolution + Insights */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          eyebrow="Evolução"
          title="Investimento diário"
          description="Meta Ads e Google Ads consolidados no período selecionado."
          className="xl:col-span-2"
        >
          {evolution.length > 0 ? (
            <EvolutionChart data={evolution} />
          ) : (
            <EmptyChart />
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Insights"
          title="Leitura do período"
          description="Sinais automáticos a partir dos seus dados."
        >
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ainda não há sinais suficientes para gerar insights neste período.
            </p>
          ) : (
            <ul className="space-y-3">
              {insights.map((i, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md",
                      i.tone === "positive" &&
                        "bg-success/12 text-[color:var(--success)]",
                      i.tone === "negative" &&
                        "bg-danger/12 text-[color:var(--danger)]",
                      i.tone === "neutral" &&
                        "bg-primary/10 text-primary-600 dark:text-primary-300",
                    )}
                  >
                    <i.icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">
                      {i.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {i.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      {/* Resumo do período + Plataformas */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          eyebrow="Resumo"
          title={`Últimos ${days} dias`}
          description="Visão consolidada do que foi entregue no período."
          className="xl:col-span-2"
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Summary label="Impressões" value={fmtInt(totals.impr)} />
            <Summary label="Cliques" value={fmtInt(totals.clicks)} />
            <Summary label="CTR" value={`${ctr.toFixed(2)}%`} />
            <Summary label="Investimento" value={fmtBRL(totalSpend)} />
            <Summary label="Conversões" value={fmtInt(totals.conv)} />
            <Summary label="Taxa de conversão" value={`${convRate.toFixed(2)}%`} />
            <Summary label="Alcance Instagram" value={fmtInt(totals.reach)} />
            <Summary label="Engajamento Instagram" value={fmtInt(totals.engagement)} />
          </dl>
        </SectionCard>

        <SectionCard
          eyebrow="Plataformas"
          title="Conectadas à sua conta"
          description={`${platformsActive.length} ${
            platformsActive.length === 1 ? "fonte" : "fontes"
          } enviando dados`}
        >
          {platformsActive.length === 0 ? (
            <EmptyPlatforms />
          ) : (
            <ul className="space-y-2">
              {platformsActive.map((p) => (
                <li
                  key={p.key}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary-600 dark:text-primary-300">
                      <Plug className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-[13px] font-medium text-foreground">
                      {p.label}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[color:var(--success)]">
                    <CheckCircle2 className="h-3 w-3" />
                    Ativa
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      {/* Últimas atualizações + Seus clientes */}
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          eyebrow="Atividade"
          title="Últimas atualizações"
          description="Quando cada conta recebeu novos dados pela última vez."
        >
          {clientes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem atualizações ainda.</p>
          ) : (
            <ul className="space-y-3">
              {clientes.slice(0, 5).map((c) => (
                <li key={c.cliente} className="flex items-start gap-3">
                  <span className="mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary/40 text-secondary-700 dark:bg-secondary-700/30 dark:text-secondary-100">
                    <Clock3 className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {c.cliente}
                    </p>
                    <p className="text-[11.5px] text-muted-foreground">
                      Dados até {c.ultima_data_recebida ?? "—"} ·{" "}
                      {(c.plataformas_ativas ?? []).length} plataforma
                      {(c.plataformas_ativas ?? []).length === 1 ? "" : "s"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Acesso"
          title="Suas contas"
          description={`${clientes.length} ${
            clientes.length === 1 ? "cliente vinculado" : "clientes vinculados"
          }`}
          className="xl:col-span-2"
          bodyClassName="px-0 py-0"
        >
          {clientes.length === 0 ? (
            <div className="px-5 py-8">
              <EmptyClientes />
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {clientes.map((c) => (
                <li key={c.cliente}>
                  <Link
                    to="/cliente/$cliente"
                    params={{ cliente: c.cliente }}
                    className="lotus-row group flex items-center gap-4 px-5 py-3.5"
                  >
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-100 to-secondary-100 text-[12px] font-semibold text-primary-700 dark:from-primary-700/40 dark:to-secondary-700/30 dark:text-primary-100">
                      {c.cliente.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium text-foreground">
                        {c.cliente}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1">
                        {(c.plataformas_ativas ?? []).length === 0 ? (
                          <span className="text-[11px] text-muted-foreground">
                            Sem plataformas
                          </span>
                        ) : (
                          (c.plataformas_ativas ?? []).map((p) => (
                            <span
                              key={p}
                              className="inline-flex items-center rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                            >
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
                      <div className="tabular-nums">
                        {fmtInt(c.total_registros)} registros
                      </div>
                      <div>Última: {c.ultima_data_recebida ?? "—"}</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-300" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>
    </div>
  );
}

/* ----------------------- helpers ----------------------- */

function sumOverview(rows: Overview[]) {
  const googleSpendByCliente = new Map<string, number>();

  const totals = rows.reduce(
    (acc, r) => {
      acc.meta += r.meta_spend ?? 0;
      googleSpendByCliente.set(
        r.cliente,
        Math.max(googleSpendByCliente.get(r.cliente) ?? 0, r.google_spend ?? 0),
      );
      acc.impr += r.total_impressions ?? 0;
      acc.clicks += r.total_clicks ?? 0;
      acc.sessions += r.ga4_sessions ?? 0;
      acc.conv += r.ga4_conversions ?? 0;
      acc.reach += r.instagram_reach ?? 0;
      acc.engagement += r.instagram_interactions ?? 0;
      return acc;
    },
    { meta: 0, google: 0, impr: 0, clicks: 0, sessions: 0, conv: 0, reach: 0, engagement: 0 },
  );

  totals.google = Array.from(googleSpendByCliente.values()).reduce(
    (sum, value) => sum + value,
    0,
  );

  return totals;
}

function pctDelta(curr: number, prev: number): number | null {
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return null;
  if (prev <= 0 && curr <= 0) return null;
  if (prev <= 0) return 100;
  return ((curr - prev) / prev) * 100;
}

function buildEvolution(rows: Overview[]): EvolutionPoint[] {
  const byDate = new Map<string, { google: number; meta: number }>();
  for (const r of rows) {
    const cur = byDate.get(r.data) ?? { google: 0, meta: 0 };
    cur.google += r.google_spend ?? 0;
    cur.meta += r.meta_spend ?? 0;
    byDate.set(r.data, cur);
  }
  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, google: v.google, meta: v.meta }));
}

type Insight = {
  title: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
  icon: typeof TrendingUp;
};

function buildInsights(args: {
  spendDelta: number | null;
  convDelta: number | null;
  sessionsDelta: number | null;
  ctr: number;
  convRate: number;
  cpa: number;
  totals: ReturnType<typeof sumOverview>;
  days: number;
}): Insight[] {
  const out: Insight[] = [];
  const { spendDelta, convDelta, sessionsDelta, ctr, cpa, totals, days } = args;

  if (convDelta != null && Math.abs(convDelta) >= 5) {
    const up = convDelta > 0;
    out.push({
      title: `Conversões ${up ? "subiram" : "recuaram"} ${Math.abs(convDelta).toFixed(1)}%`,
      detail: `Comparado aos ${days} dias anteriores. ${
        up ? "Mantenha o ritmo da campanha vencedora." : "Vale revisar criativos e públicos."
      }`,
      tone: up ? "positive" : "negative",
      icon: up ? TrendingUp : TrendingDown,
    });
  }

  if (spendDelta != null && Math.abs(spendDelta) >= 8) {
    const up = spendDelta > 0;
    out.push({
      title: `Investimento ${up ? "aumentou" : "caiu"} ${Math.abs(spendDelta).toFixed(1)}%`,
      detail: up
        ? "O ritmo de mídia acelerou no período. Confirme se o ROI acompanha."
        : "O ritmo de mídia diminuiu. Avalie se há pausa programada ou pacing.",
      tone: "neutral",
      icon: up ? TrendingUp : TrendingDown,
    });
  }

  if (ctr > 0) {
    const good = ctr >= 1.5;
    out.push({
      title: `CTR médio em ${ctr.toFixed(2)}%`,
      detail: good
        ? "Sinal saudável de aderência criativa/público."
        : "Abaixo da média saudável (1,5%). Vale testar novos criativos.",
      tone: good ? "positive" : "neutral",
      icon: good ? Sparkles : Compass,
    });
  }

  if (cpa > 0 && totals.conv >= 5) {
    out.push({
      title: `Custo por conversão: ${cpa.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 2,
      })}`,
      detail: `Base: ${totals.conv} conversões nos últimos ${days} dias.`,
      tone: "neutral",
      icon: Target,
    });
  }

  if (sessionsDelta != null && Math.abs(sessionsDelta) >= 10) {
    const up = sessionsDelta > 0;
    out.push({
      title: `Tráfego ${up ? "cresceu" : "caiu"} ${Math.abs(sessionsDelta).toFixed(1)}%`,
      detail: "Variação de sessões registradas no GA4 em relação ao período anterior.",
      tone: up ? "positive" : "negative",
      icon: up ? TrendingUp : TrendingDown,
    });
  }

  return out.slice(0, 5);
}

const PLATFORM_LABEL: Record<string, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  ga4: "Google Analytics 4",
  instagram: "Instagram",
  google_business: "Google Business",
  tiktok: "TikTok",
};

function collectPlatforms(clientes: ClienteAtivo[]) {
  const set = new Set<string>();
  for (const c of clientes) (c.plataformas_ativas ?? []).forEach((p) => set.add(p));
  return Array.from(set)
    .sort()
    .map((key) => ({ key, label: PLATFORM_LABEL[key] ?? key }));
}

/* ----------------------- subcomponents ----------------------- */

function HeroSpend({
  value,
  delta,
  google,
  meta,
  days,
  className,
}: {
  value: number;
  delta: number | null;
  google: number;
  meta: number;
  days: number;
  className?: string;
}) {
  const hasDelta = delta != null;
  const up = hasDelta && delta! > 0;
  return (
    <div
      className={cn(
        "lotus-surface lotus-petal-accent relative flex flex-col justify-between overflow-hidden p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
          Investimento · últimos {days} dias
        </p>
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-border/70 bg-background/60 text-primary-600 dark:text-primary-300">
          <DollarSign className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-5 flex items-end gap-3">
        <span className="font-display text-[44px] leading-none font-semibold tracking-[-0.03em] tabular-nums text-foreground">
          {fmtBRL(value)}
        </span>
        {hasDelta && (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
              up
                ? "bg-success/12 text-[color:var(--success)]"
                : "bg-danger/12 text-[color:var(--danger)]",
            )}
          >
            {up ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {Math.abs(delta!).toFixed(1)}% vs período anterior
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/60 pt-4">
        <SplitMetric label="Google Ads" value={fmtBRL(google)} tone="secondary" />
        <SplitMetric label="Meta Ads" value={fmtBRL(meta)} tone="primary" />
      </div>
    </div>
  );
}

function SplitMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "secondary";
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          tone === "primary" ? "bg-primary-500" : "bg-secondary-500",
        )}
      />
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
          {label}
        </p>
        <p className="font-display text-[15px] font-semibold tabular-nums text-foreground">
          {value}
        </p>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary-600 dark:text-primary-300">
        <Sparkles className="h-4 w-4" />
      </div>
      <p className="font-display text-sm font-semibold">
        Sem investimento registrado no período
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Quando suas campanhas começarem a rodar, a evolução diária aparece aqui em
        tempo quase real.
      </p>
    </div>
  );
}

function EmptyPlatforms() {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary-600 dark:text-primary-300">
        <Plug className="h-4 w-4" />
      </div>
      <p className="font-display text-sm font-semibold">Nenhuma fonte ativa</p>
      <p className="max-w-xs text-xs text-muted-foreground">
        Assim que uma plataforma começar a enviar métricas, ela aparece aqui
        automaticamente.
      </p>
    </div>
  );
}

function EmptyClientes() {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary-600 dark:text-primary-300">
        <Inbox className="h-4 w-4" />
      </div>
      <p className="font-display text-sm font-semibold">Nenhuma conta vinculada</p>
      <p className="max-w-md text-xs text-muted-foreground">
        Sua equipe Lotus ainda não vinculou nenhuma conta ao seu acesso. Assim que
        isso for feito, ela aparece aqui automaticamente.
      </p>
    </div>
  );
}

function EmptyAccount() {
  return (
    <div className="lotus-surface lotus-aurora flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card/80 shadow-[var(--shadow-sm)]">
        <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-300" />
      </div>
      <h2 className="font-display text-xl font-semibold tracking-tight">
        Sua conta está sendo preparada
      </h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Em breve seus dados começam a aparecer aqui. Enquanto isso, a equipe Lotus
        está configurando integrações, fontes e relatórios da sua operação.
      </p>
    </div>
  );
}
