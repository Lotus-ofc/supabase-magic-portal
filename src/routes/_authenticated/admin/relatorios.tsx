// Lotus · Central de Relatórios
// Hub do módulo de relatórios. NÃO reimplementa dashboards — apenas organiza
// o acesso ao executivo e aos relatórios individuais por cliente, reutilizando
// vw_overview_cliente, vw_clientes_ativos e helpers de src/lib/metrics.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/lotus/PageHeader";
import { StatCard } from "@/components/lotus/StatCard";
import { SectionCard } from "@/components/lotus/SectionCard";
import { PeriodToggle, type PeriodDays } from "@/components/lotus/PeriodToggle";
import { DeltaPill } from "@/components/lotus/DeltaPill";
import {
  PLATFORM_LABEL,
  aggregateByCliente,
  deriveCpa,
  deriveCtr,
  formatMetric,
  pctDelta,
  periodRange,
  sumOverview,
  type OverviewRow,
} from "@/lib/metrics";
import {
  ArrowUpRight,
  DollarSign,
  Target,
  Activity,
  Eye,
  FileBarChart,
  LayoutDashboard,
  UserCheck,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------- Queries ----------------

type ClienteAtivo = {
  cliente: string;
  ultima_data_recebida: string | null;
  ultima_ingestao: string | null;
  plataformas_ativas: string[] | null;
  total_registros: number;
};

const clientesAtivosQuery = queryOptions({
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

const overviewQuery = (days: PeriodDays) =>
  queryOptions({
    queryKey: ["relatorios", "overview", days],
    queryFn: async (): Promise<OverviewRow[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days * 2);
      const { data, error } = await supabase
        .from("vw_overview_cliente")
        .select("*")
        .gte("data", since.toISOString().slice(0, 10))
        .order("data", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OverviewRow[];
    },
  });

// ---------------- Route ----------------

export const Route = createFileRoute("/_authenticated/admin/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · Admin Lotus" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(clientesAtivosQuery);
    void context.queryClient.ensureQueryData(overviewQuery(30));
  },
  component: RelatoriosHub,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div>Não encontrado</div>,
});

function RelatoriosHub() {
  const [days, setDays] = useState<PeriodDays>(30);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Central de relatórios"
        title="Relatórios Lotus"
        description="Acesso unificado ao relatório executivo da agência e aos relatórios individuais por cliente."
        actions={<PeriodToggle value={days} onChange={setDays} />}
      />

      {/* Atalhos de relatório */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ShortcutCard
          to="/admin"
          icon={LayoutDashboard}
          eyebrow="Visão consolidada"
          title="Relatório executivo da agência"
          description="KPIs do portfólio inteiro, mix de investimento, top clientes e ingestão por plataforma."
        />
        <ShortcutCard
          to="/dashboard"
          icon={FileBarChart}
          eyebrow="Visão pessoal"
          title="Sua conta na Lotus"
          description="Resultados consolidados que o cliente final enxerga ao entrar na plataforma."
        />
      </section>

      <Suspense fallback={<HubSkeleton />}>
        <HubBody days={days} />
      </Suspense>
    </div>
  );
}

function ShortcutCard({
  to,
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="lotus-surface group relative flex items-start gap-4 p-5 transition-all hover:-translate-y-px hover:shadow-[var(--shadow-md)]"
    >
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary-600 dark:text-primary-300">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300">
          {eyebrow}
        </p>
        <h3 className="mt-0.5 font-display text-[15px] font-semibold text-foreground">
          {title}
        </h3>
        <p className="mt-1 text-[12.5px] text-muted-foreground">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </Link>
  );
}

function HubSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

function HubBody({ days }: { days: PeriodDays }) {
  const { data: ativos } = useSuspenseQuery(clientesAtivosQuery);
  const { data: overview } = useSuspenseQuery(overviewQuery(days));
  const [q, setQ] = useState("");

  const period = useMemo(() => periodRange(days), [days]);
  const current = overview.filter((r) => r.data >= period.from && r.data <= period.to);
  const previous = overview.filter((r) => r.data >= period.prevFrom && r.data <= period.prevTo);
  const cT = sumOverview(current);
  const pT = sumOverview(previous);
  const ctr = deriveCtr(cT.impressions, cT.clicks);
  const cpa = deriveCpa(cT.spend, cT.conversions);

  const agregados = aggregateByCliente(current).sort(
    (a, b) => b.totals.spend - a.totals.spend,
  );
  const prevByCliente = useMemo(() => {
    const m = new Map<string, ReturnType<typeof sumOverview>>();
    for (const c of aggregateByCliente(previous)) m.set(c.cliente, c.totals);
    return m;
  }, [previous]);

  const ativosByName = useMemo(() => {
    const m = new Map<string, ClienteAtivo>();
    for (const a of ativos) m.set(a.cliente, a);
    return m;
  }, [ativos]);

  // União: clientes com dado no período + clientes ativos sem dado no recorte
  const todos = useMemo(() => {
    const seen = new Set(agregados.map((a) => a.cliente));
    const sem = ativos
      .filter((a) => !seen.has(a.cliente))
      .map((a) => ({
        cliente: a.cliente,
        totals: sumOverview([]),
        ctr: 0,
        cpa: 0,
      }));
    return [...agregados, ...sem];
  }, [agregados, ativos]);

  const filtered = q
    ? todos.filter((c) => c.cliente.toLowerCase().includes(q.toLowerCase()))
    : todos;

  return (
    <div className="space-y-7">
      {/* KPIs do portfólio no período */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Investimento total"
          value={formatMetric("spend", cT.spend)}
          icon={DollarSign}
          delta={pctDelta(cT.spend, pT.spend)}
          hint={`Meta ${formatMetric("spend", cT.meta_spend)} · Google ${formatMetric("spend", cT.google_spend)}`}
        />
        <StatCard
          label="Conversões"
          value={formatMetric("conversions", cT.conversions)}
          icon={Target}
          delta={pctDelta(cT.conversions, pT.conversions)}
          hint={cpa > 0 ? `CPA ${formatMetric("spend", cpa)}` : undefined}
        />
        <StatCard
          label="Sessões GA4"
          value={formatMetric("sessions", cT.sessions)}
          icon={Activity}
          delta={pctDelta(cT.sessions, pT.sessions)}
          hint={cT.impressions > 0 ? `CTR ${ctr.toFixed(2)}%` : undefined}
        />
        <StatCard
          label="Clientes com dado"
          value={agregados.length}
          icon={UserCheck}
          hint={`${ativos.length} ativos no total`}
        />
      </section>

      {/* Lista de relatórios por cliente */}
      <SectionCard
        eyebrow="Relatórios individuais"
        title="Por cliente"
        description="Cada linha abre o relatório completo do cliente, com KPIs, evolução e detalhe por plataforma."
        bodyClassName="px-0 py-0"
      >
        <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente…"
            className="h-7 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "cliente" : "clientes"}
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            Nenhum cliente encontrado.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {filtered.map((c) => {
              const prev = prevByCliente.get(c.cliente);
              const spendDelta = prev ? pctDelta(c.totals.spend, prev.spend) : null;
              const ativo = ativosByName.get(c.cliente);
              return (
                <li key={c.cliente} className="group">
                  <Link
                    to="/cliente/$cliente"
                    params={{ cliente: c.cliente }}
                    className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13.5px] font-semibold text-foreground">
                          {c.cliente}
                        </p>
                        {ativo?.ultima_data_recebida && (
                          <span className="shrink-0 text-[10.5px] text-muted-foreground">
                            · última métrica {fmtRelDay(ativo.ultima_data_recebida)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(ativo?.plataformas_ativas ?? []).slice(0, 5).map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                          >
                            {PLATFORM_LABEL[p as keyof typeof PLATFORM_LABEL] ?? p}
                          </span>
                        ))}
                        {(!ativo || (ativo.plataformas_ativas ?? []).length === 0) && (
                          <span className="text-[11px] text-muted-foreground">
                            Sem ingestão registrada
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="hidden text-right sm:block">
                      <p className="font-display text-[14px] font-semibold tabular-nums text-foreground">
                        {formatMetric("spend", c.totals.spend)}
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                        {formatMetric("conversions", c.totals.conversions)} conv.
                      </p>
                    </div>

                    <div className="hidden w-20 justify-end sm:flex">
                      <DeltaPill delta={spendDelta} size="sm" />
                    </div>

                    <ArrowUpRight
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-all",
                        "group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

function fmtRelDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const diff = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (diff <= 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff < 7) return `há ${diff}d`;
  return d.toLocaleDateString("pt-BR");
}
