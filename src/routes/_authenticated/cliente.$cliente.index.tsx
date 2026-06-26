import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/lotus/PageHeader";
import { StatCard } from "@/components/lotus/StatCard";
import { SectionCard } from "@/components/lotus/SectionCard";
import { PeriodPicker } from "@/components/lotus/PeriodPicker";
import { DeltaPill } from "@/components/lotus/DeltaPill";
import { ChartFrame, ChartLegendItem } from "@/components/lotus/charts/ChartFrame";
import { AreaChartLotus, getSeriesColor } from "@/components/lotus/charts/AreaChartLotus";
import { DonutChartLotus } from "@/components/lotus/charts/DonutChartLotus";
import {
  PLATFORM_LABEL,
  type OverviewRow,
  type Platform,
  buildInsights,
  dailyFromOverview,
  deriveConvRate,
  deriveCpa,
  deriveCtr,
  formatMetric,
  pctDelta,
  periodFromDates,
  periodRange,
  spendShareByPlatform,
  sumOverview,
} from "@/lib/metrics";
import { getPlatformDef } from "@/lib/platforms/registry";
import { clientePlatformsQuery, type PlatformKey } from "./cliente.$cliente";
import { resolvePeriod, type Period, type PeriodInput } from "@/lib/period";
import {
  Sparkles,
  Target,
  Activity,
  MousePointerClick,
  Eye,
  Heart,
  TrendingUp,
  TrendingDown,
  Compass,
  Inbox,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clienteRefQuery } from "./cliente.$cliente";

const ROUTE_TO_PLATFORM: Partial<Record<PlatformKey, Platform>> = {
  instagram: "instagram",
  "meta-ads": "meta_ads",
  "google-ads": "google_ads",
  ga4: "ga4",
  "google-business": "google_business",
};

const overviewQuery = (nomeCliente: string, prevFrom: string, to: string) =>
  queryOptions({
    queryKey: ["cliente-overview", nomeCliente, prevFrom, to],
    queryFn: async (): Promise<OverviewRow[]> => {
      const { data, error } = await supabase
        .from("vw_overview_cliente")
        .select("*")
        .eq("cliente", nomeCliente)
        .gte("data", prevFrom)
        .lte("data", to)
        .order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OverviewRow[];
    },
  });

type DailyView = Record<string, unknown> & {
  data: string;
  cliente: string;
};

const platformDailyQuery = (nomeCliente: string, platform: Platform, from: string, to: string) =>
  queryOptions({
    queryKey: ["cliente-platform", nomeCliente, platform, from, to],
    queryFn: async (): Promise<DailyView[]> => {
      const def = getPlatformDef(platform);
      if (!def) return [];
      const { data, error } = await supabase
        .from(def.view)
        .select("*")
        .eq("cliente", nomeCliente)
        .gte("data", from)
        .lte("data", to)
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DailyView[];
    },
  });

// ---------------- Route ----------------

export const Route = createFileRoute("/_authenticated/cliente/$cliente/")({
  component: ClienteOverviewPage,
});

function ClienteOverviewPage() {
  const { cliente: slug } = Route.useParams();
  const [periodInput, setPeriodInput] = useState<PeriodInput>({ preset: "last_30" });
  const period = useMemo(() => resolvePeriod(periodInput), [periodInput]);

  return (
    <Suspense fallback={<ClienteSkeleton />}>
      <ClienteResolved
        slug={slug}
        period={period}
        periodInput={periodInput}
        setPeriodInput={setPeriodInput}
      />
    </Suspense>
  );
}

function ClienteResolved({
  slug,
  period,
  periodInput,
  setPeriodInput,
}: {
  slug: string;
  period: Period;
  periodInput: PeriodInput;
  setPeriodInput: (v: PeriodInput) => void;
}) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));
  if (!ref) {
    return (
      <div className="lotus-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }
  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Conta cliente"
        title={ref.nome}
        description="Resultados consolidados das suas plataformas, atualizados automaticamente."
        actions={<PeriodPicker value={periodInput} onChange={setPeriodInput} />}
      />
      <ClienteBody cliente={ref.queryName} period={period} />
    </div>
  );
}

function ClienteSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="lotus-surface h-28">
            <div className="lotus-skeleton m-4 h-3 w-1/2" />
            <div className="lotus-skeleton mx-4 mt-3 h-6 w-2/3" />
          </div>
        ))}
      </div>
      <div className="lotus-surface h-[320px]">
        <div className="lotus-skeleton m-5 h-3 w-40" />
      </div>
    </div>
  );
}

// ---------------- Body ----------------

function ClienteBody({ cliente, period }: { cliente: string; period: Period }) {
  const { data: rows } = useSuspenseQuery(overviewQuery(cliente, period.prevFrom, period.to));
  const { data: detectedRoutes } = useSuspenseQuery(clientePlatformsQuery(cliente));

  const days = period.days;

  const current = rows.filter((r) => r.data >= period.from && r.data <= period.to);
  const previous = rows.filter((r) => r.data >= period.prevFrom && r.data <= period.prevTo);
  const cT = sumOverview(current);
  const pT = sumOverview(previous);

  const ctr = deriveCtr(cT.impressions, cT.clicks);
  const ctrPrev = deriveCtr(pT.impressions, pT.clicks);
  const convRate = deriveConvRate(cT.sessions, cT.conversions);
  const cpa = deriveCpa(cT.spend, cT.conversions);

  const daily = dailyFromOverview(current, period);
  const insights = buildInsights({ current: cT, previous: pT, days });
  const share = spendShareByPlatform(current);

  const fromOverview = collectActivePlatforms(cT);
  const fromDetection = detectedRoutes
    .map((k) => ROUTE_TO_PLATFORM[k])
    .filter((p): p is Platform => !!p);
  const platformsActive = [...new Set([...fromOverview, ...fromDetection])];
  const hasData = current.length > 0 || platformsActive.length > 0;

  if (!hasData) return <EmptyAccount />;

  return (
    <div className="space-y-7">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <StatCard
          label="Alcance"
          value={formatMetric("reach", cT.reach)}
          icon={Eye}
          emphasis="hero"
          delta={pctDelta(cT.reach, pT.reach)}
          hint="Pessoas únicas alcançadas no período"
          className="lg:col-span-2"
        />
        <StatCard
          label="Engajamento"
          value={formatMetric("engagement", cT.engagement)}
          icon={Heart}
          delta={pctDelta(cT.engagement, pT.engagement)}
        />
        <StatCard
          label="Impressões"
          value={formatMetric("impressions", cT.impressions)}
          icon={Activity}
          delta={pctDelta(cT.impressions, pT.impressions)}
        />
        <StatCard
          label="Cliques"
          value={formatMetric("clicks", cT.clicks)}
          icon={MousePointerClick}
          delta={pctDelta(cT.clicks, pT.clicks)}
          hint={cT.impressions > 0 ? `CTR ${ctr.toFixed(2)}%` : undefined}
        />
        <StatCard
          label="Conversões"
          value={formatMetric("conversions", cT.conversions)}
          icon={Target}
          delta={pctDelta(cT.conversions, pT.conversions)}
          hint={cT.sessions > 0 ? `${convRate.toFixed(2)}% taxa` : undefined}
        />
      </section>

      <ComparisonStrip cliente={cliente} />

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <ChartFrame
          eyebrow="Evolução"
          title="Investimento e conversões"
          description="Comportamento diário no período selecionado."
          headline={formatMetric("spend", cT.spend)}
          meta={<DeltaPill delta={pctDelta(cT.spend, pT.spend)} showSuffix />}
          legend={
            <>
              <ChartLegendItem
                color={getSeriesColor("primary")}
                label="Meta Ads"
                value={formatMetric("spend", cT.meta_spend)}
              />
              <ChartLegendItem
                color={getSeriesColor("secondary")}
                label="Google Ads"
                value={formatMetric("spend", cT.google_spend)}
              />
              <ChartLegendItem
                color={getSeriesColor("success")}
                label="Conversões"
                value={formatMetric("conversions", cT.conversions)}
              />
            </>
          }
          className="xl:col-span-2"
        >
          {cT.spend === 0 && cT.conversions === 0 ? (
            <EmptyChart />
          ) : (
            <AreaChartLotus
              data={daily}
              yMetric="spend"
              series={[
                { key: "meta_spend", label: "Meta Ads", metric: "spend", tone: "primary" },
                { key: "google_spend", label: "Google Ads", metric: "spend", tone: "secondary" },
                { key: "conversions", label: "Conversões", metric: "conversions", tone: "success" },
              ]}
              height={280}
            />
          )}
        </ChartFrame>

        <ChartFrame
          eyebrow="Distribuição"
          title="Mix de investimento"
          description="Onde o orçamento foi alocado no período."
        >
          {share.length === 0 ? (
            <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary-600 dark:text-primary-300">
                <Compass className="h-4 w-4" />
              </div>
              <p className="text-[12.5px] text-muted-foreground">
                Sem investimento registrado no período.
              </p>
            </div>
          ) : (
            <DonutChartLotus
              slices={share.map((s) => ({
                key: s.platform,
                label: s.label,
                value: s.value,
                tone: s.platform === "meta_ads" ? "primary" : "secondary",
              }))}
              metric="spend"
              centerLabel="Total"
              centerValue={formatMetric("spend", cT.spend)}
            />
          )}
        </ChartFrame>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <SectionCard
          eyebrow="Resumo"
          title={`Últimos ${days} dias`}
          description="Visão consolidada do que foi entregue no período."
          className="xl:col-span-2"
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <Summary label="Investimento" value={formatMetric("spend", cT.spend)} />
            <Summary label="Impressões" value={formatMetric("impressions", cT.impressions)} />
            <Summary label="Cliques" value={formatMetric("clicks", cT.clicks)} />
            <Summary
              label="CTR"
              value={cT.impressions > 0 ? `${ctr.toFixed(2)}%` : "—"}
              compareValue={ctrPrev > 0 ? `${ctrPrev.toFixed(2)}% antes` : undefined}
            />
            <Summary label="Sessões GA4" value={formatMetric("sessions", cT.sessions)} />
            <Summary label="Conversões" value={formatMetric("conversions", cT.conversions)} />
            <Summary
              label="Taxa de conversão"
              value={cT.sessions > 0 ? `${convRate.toFixed(2)}%` : "—"}
            />
            <Summary
              label="Custo por conversão"
              value={cpa > 0 ? formatMetric("spend", cpa) : "—"}
            />
          </dl>
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
              {insights.map((i) => (
                <li
                  key={i.id}
                  className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3"
                >
                  <span
                    className={cn(
                      "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md",
                      i.tone === "positive" && "bg-success/12 text-[color:var(--success)]",
                      i.tone === "negative" && "bg-danger/12 text-[color:var(--danger)]",
                      i.tone === "neutral" &&
                        "bg-primary/10 text-primary-600 dark:text-primary-300",
                    )}
                  >
                    {i.tone === "positive" ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : i.tone === "negative" ? (
                      <TrendingDown className="h-3.5 w-3.5" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{i.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{i.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </section>

      <PlatformDetail cliente={cliente} period={period} platforms={platformsActive} />
    </div>
  );
}

function ComparisonStrip({ cliente }: { cliente: string }) {
  const since = periodRange(90).from;

  const { data } = useSuspenseQuery({
    queryKey: ["cliente-overview-90", cliente, since],
    queryFn: async (): Promise<OverviewRow[]> => {
      const { data, error } = await supabase
        .from("vw_overview_cliente")
        .select("*")
        .eq("cliente", cliente)
        .gte("data", since);
      if (error) throw error;
      return (data ?? []) as OverviewRow[];
    },
  });

  const windows: Array<7 | 30 | 90> = [7, 30, 90];
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {windows.map((w) => {
        const p = periodRange(w);
        const cur = data.filter((r) => r.data >= p.from && r.data <= p.to);
        const prev = data.filter((r) => r.data >= p.prevFrom && r.data <= p.prevTo);
        const cT = sumOverview(cur);
        const pT = sumOverview(prev);
        return (
          <div key={w} className="lotus-surface flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Últimos {w} dias
              </p>
              <p className="mt-0.5 font-display text-lg font-semibold tabular-nums text-foreground">
                {formatMetric("spend", cT.spend)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {formatMetric("conversions", cT.conversions)} conversões ·{" "}
                {formatMetric("sessions", cT.sessions)} sessões
              </p>
            </div>
            <DeltaPill delta={pctDelta(cT.spend, pT.spend)} size="md" />
          </div>
        );
      })}
    </section>
  );
}

function collectActivePlatforms(t: ReturnType<typeof sumOverview>): Platform[] {
  const out: Platform[] = [];
  if (t.meta_spend > 0) out.push("meta_ads");
  if (t.google_spend > 0) out.push("google_ads");
  if (t.sessions > 0 || t.conversions > 0) out.push("ga4");
  if (t.reach > 0 || t.engagement > 0) out.push("instagram");
  return out;
}

function PlatformDetail({
  cliente,
  period,
  platforms,
}: {
  cliente: string;
  period: Period;
  platforms: Platform[];
}) {
  const [tab, setTab] = useState<Platform>(platforms[0] ?? "meta_ads");
  if (platforms.length === 0) return null;

  return (
    <SectionCard
      eyebrow="Detalhamento"
      title="Por plataforma"
      description="Visão diária e por campanha de cada fonte ativa."
      bodyClassName="px-0 py-0"
    >
      <div className="flex flex-wrap items-center gap-1 border-b border-border/70 px-3 py-2">
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setTab(p)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
              tab === p
                ? "bg-primary/12 text-primary-700 dark:text-primary-200"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {PLATFORM_LABEL[p]}
          </button>
        ))}
      </div>

      <Suspense
        fallback={
          <div className="space-y-2 p-4">
            <div className="lotus-skeleton h-4 w-1/3" />
            <div className="lotus-skeleton h-3 w-2/3" />
            <div className="lotus-skeleton h-3 w-1/2" />
          </div>
        }
      >
        <PlatformTable cliente={cliente} platform={tab} period={period} />
      </Suspense>
    </SectionCard>
  );
}

function PlatformTable({
  cliente,
  platform,
  period,
}: {
  cliente: string;
  platform: Platform;
  period: Period;
}) {
  const { data } = useSuspenseQuery(platformDailyQuery(cliente, platform, period.from, period.to));

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[13.5px] font-medium text-foreground">Sem dados neste período</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Quando a integração enviar novos registros, eles aparecem aqui.
          </p>
        </div>
      </div>
    );
  }

  const cols = Object.keys(data[0]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
            {cols.map((c) => (
              <th key={c} className="px-4 py-2.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-border/60 hover:bg-muted/20">
              {cols.map((c) => {
                const v = row[c];
                const display =
                  v == null
                    ? "—"
                    : typeof v === "number"
                      ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                      : String(v);
                return (
                  <td
                    key={c}
                    className="whitespace-nowrap px-4 py-2.5 tabular-nums text-foreground"
                  >
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Summary({
  label,
  value,
  compareValue,
}: {
  label: string;
  value: string;
  compareValue?: string;
}) {
  return (
    <div>
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1 font-display text-lg font-semibold tabular-nums text-foreground">
        {value}
      </dd>
      {compareValue && <p className="mt-0.5 text-[10.5px] text-muted-foreground">{compareValue}</p>}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary-600 dark:text-primary-300">
        <Sparkles className="h-4 w-4" />
      </div>
      <p className="font-display text-sm font-semibold">Sem registros no período</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Quando suas campanhas começarem a rodar, a evolução aparece aqui automaticamente.
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
        Em breve os dados das suas plataformas começam a aparecer aqui.
      </p>
    </div>
  );
}
