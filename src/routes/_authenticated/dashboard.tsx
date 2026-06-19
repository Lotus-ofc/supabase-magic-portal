import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/lotus/PageHeader";
import { StatCard } from "@/components/lotus/StatCard";
import {
  DollarSign,
  MousePointerClick,
  Eye,
  Target,
  Activity,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

type ClienteAtivo = {
  cliente: string;
  ultima_data_recebida: string | null;
  ultima_ingestao: string | null;
  plataformas_ativas: string[] | null;
  total_registros: number;
};

type Overview = {
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
};

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

const overviewQuery = queryOptions({
  queryKey: ["vw_overview_cliente", "30d"],
  queryFn: async (): Promise<Overview[]> => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data, error } = await supabase
      .from("vw_overview_cliente")
      .select("*")
      .gte("data", since.toISOString().slice(0, 10));
    if (error) throw error;
    return (data ?? []) as Overview[];
  },
});

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Visão geral · Lotus" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(clientesQuery);
    void context.queryClient.ensureQueryData(overviewQuery);
  },
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">
      Erro ao carregar dashboard: {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Não encontrado</div>,
});

const fmtBRL = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : Math.round(n).toLocaleString("pt-BR");

function DashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Plataforma Lotus"
        title="Visão geral"
        description="Acompanhe a performance consolidada do seu portfólio nos últimos 30 dias."
      />
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="lotus-surface h-28 animate-lotus-fade">
                <div className="lotus-skeleton m-5 h-3 w-1/2" />
                <div className="lotus-skeleton mx-5 mt-3 h-6 w-2/3" />
              </div>
            ))}
          </div>
        }
      >
        <DashboardBody />
      </Suspense>
    </div>
  );
}

function DashboardBody() {
  const { data: overview } = useSuspenseQuery(overviewQuery);
  const { data: clientes } = useSuspenseQuery(clientesQuery);

  const totals = overview.reduce(
    (acc, r) => {
      acc.meta += r.meta_spend ?? 0;
      acc.google += r.google_spend ?? 0;
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

  const totalSpend = totals.meta + totals.google;
  const ctr = totals.impr > 0 ? (totals.clicks / totals.impr) * 100 : 0;
  const convRate = totals.sessions > 0 ? (totals.conv / totals.sessions) * 100 : 0;

  return (
    <div className="space-y-7">
      {/* Hero KPI band: 1 grande + métricas relacionadas */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          label="Investimento total"
          value={fmtBRL(totalSpend)}
          hint={`${fmtBRL(totals.google)} Google · ${fmtBRL(totals.meta)} Meta`}
          icon={DollarSign}
          emphasis="hero"
          className="lg:col-span-3"
        />
        <StatCard label="Conversões" value={fmtInt(totals.conv)} icon={Target} hint={`${convRate.toFixed(2)}% taxa`} />
        <StatCard label="Sessões GA4" value={fmtInt(totals.sessions)} icon={Activity} />
        <StatCard label="Cliques" value={fmtInt(totals.clicks)} icon={MousePointerClick} hint={`${ctr.toFixed(2)}% CTR`} />
      </section>

      {/* Linha secundária: alcance + engajamento + impressões */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Impressões" value={fmtInt(totals.impr)} icon={Eye} emphasis="compact" />
        <StatCard label="Alcance Instagram" value={fmtInt(totals.reach)} icon={Sparkles} emphasis="compact" />
        <StatCard label="Engajamento Instagram" value={fmtInt(totals.engagement)} icon={Activity} emphasis="compact" />
      </section>

      {/* Lista de clientes — surface sólida, sem glass */}
      <section className="lotus-surface">
        <header className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <div>
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              Seus clientes
            </h2>
            <p className="text-xs text-muted-foreground">
              Acesso liberado · {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
            </p>
          </div>
        </header>

        {clientes.length === 0 ? (
          <EmptyClientes />
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
                      {(c.plataformas_ativas ?? []).length === 0 && (
                        <span className="text-[11px] text-muted-foreground">Sem plataformas</span>
                      )}
                      {(c.plataformas_ativas ?? []).map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center rounded-md border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden text-right text-[11px] text-muted-foreground sm:block">
                    <div className="tabular-nums">{fmtInt(c.total_registros)} registros</div>
                    <div>Última: {c.ultima_data_recebida ?? "—"}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary-600 dark:group-hover:text-primary-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function EmptyClientes() {
  return (
    <div className="lotus-aurora flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-card/80 shadow-[var(--shadow-sm)]">
        <Sparkles className="h-5 w-5 text-primary-600 dark:text-primary-300" />
      </div>
      <p className="font-display text-base font-semibold tracking-tight">
        Nenhum cliente acessível
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Verifique <code className="rounded bg-muted px-1 py-0.5 text-[11px]">client_access</code>{" "}
        ou se há registros em{" "}
        <code className="rounded bg-muted px-1 py-0.5 text-[11px]">base_metricas</code>.
      </p>
    </div>
  );
}
