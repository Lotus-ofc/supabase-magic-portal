import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  head: () => ({ meta: [{ title: "Dashboard · Majrá" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(clientesQuery);
    void context.queryClient.ensureQueryData(overviewQuery);
  },
  component: DashboardPage,
  errorComponent: ({ error }) => (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      Erro ao carregar dashboard: {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Não encontrado</div>,
});

const fmtBRL = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtInt = (n: number | null | undefined) =>
  n == null ? "—" : Math.round(n).toLocaleString("pt-BR");

function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Visão geral · últimos 30 dias</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
        <KPIs />
        <ClientesList />
      </Suspense>
    </div>
  );
}

function KPIs() {
  const { data: overview } = useSuspenseQuery(overviewQuery);
  const { data: clientes } = useSuspenseQuery(clientesQuery);

  const totals = overview.reduce(
    (acc, r) => {
      acc.meta += r.meta_spend ?? 0;
      acc.google += r.google_spend ?? 0;
      acc.sessions += r.ga4_sessions ?? 0;
      acc.conv += r.ga4_conversions ?? 0;
      return acc;
    },
    { meta: 0, google: 0, sessions: 0, conv: 0 },
  );

  const cards = [
    { label: "Clientes ativos", value: String(clientes.length) },
    { label: "Spend Meta Ads", value: fmtBRL(totals.meta) },
    { label: "Spend Google Ads", value: fmtBRL(totals.google) },
    { label: "Sessões GA4", value: fmtInt(totals.sessions) },
    { label: "Conversões GA4", value: fmtInt(totals.conv) },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight">{c.value}</div>
        </div>
      ))}
    </div>
  );
}

function ClientesList() {
  const { data: clientes } = useSuspenseQuery(clientesQuery);

  if (clientes.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        Nenhum cliente acessível. Verifique <code>client_access</code> ou se há registros em{" "}
        <code>base_metricas</code>.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3 text-sm font-medium">
        Clientes ({clientes.length})
      </div>
      <div className="divide-y divide-border">
        {clientes.map((c) => (
          <Link
            key={c.cliente}
            to="/cliente/$cliente"
            params={{ cliente: c.cliente }}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-accent"
          >
            <div>
              <div className="font-medium">{c.cliente}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {(c.plataformas_ativas ?? []).join(" · ") || "sem plataformas"}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Última: {c.ultima_data_recebida ?? "—"}</div>
              <div>{fmtInt(c.total_registros)} registros</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
