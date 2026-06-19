import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { listClientes, listServicos } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/lotus/PageHeader";
import { StatCard } from "@/components/lotus/StatCard";
import {
  Users,
  UserCheck,
  UserMinus,
  Briefcase,
  Activity,
  ArrowUpRight,
  RadioTower,
} from "lucide-react";

type ClienteAtivo = {
  cliente: string;
  ultima_data_recebida: string | null;
  ultima_ingestao: string | null;
  plataformas_ativas: string[] | null;
  total_registros: number;
};

const clientesAdminQuery = queryOptions({
  queryKey: ["admin", "clientes"],
  queryFn: () => listClientes(),
});

const servicosQuery = queryOptions({
  queryKey: ["admin", "servicos"],
  queryFn: () => listServicos(),
});

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

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Visão geral · Admin Lotus" }] }),
  loader: ({ context }) => {
    void context.queryClient.ensureQueryData(clientesAdminQuery);
    void context.queryClient.ensureQueryData(servicosQuery);
    void context.queryClient.ensureQueryData(clientesAtivosQuery);
  },
  component: AdminOverview,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div>Não encontrado</div>,
});

function relTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3600_000);
  if (h < 1) return "agora há pouco";
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `há ${days}d`;
  return d.toLocaleDateString("pt-BR");
}

function AdminOverview() {
  const { data: clientes } = useSuspenseQuery(clientesAdminQuery);
  const { data: servicos } = useSuspenseQuery(servicosQuery);
  const { data: ativos } = useSuspenseQuery(clientesAtivosQuery);

  const total = clientes.length;
  const ativosCount = clientes.filter((c: any) => c.ativo).length;
  const inativosCount = total - ativosCount;
  const servicosCount = servicos.filter((s: any) => s.ativo).length;
  const totalAcessos = clientes.reduce((sum: number, c: any) => sum + (c.qtd_acessos ?? 0), 0);
  const ultimaSync = ativos
    .map((a) => a.ultima_ingestao)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;

  const recentes = [...clientes]
    .sort((a: any, b: any) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, 6);

  const topAtivos = [...ativos].slice(0, 5);

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Painel administrativo"
        title="Centro de operações"
        description="Visão executiva do portfólio de clientes, serviços contratados e ingestão de dados."
        actions={
          <Link
            to="/admin/clientes/novo"
            className="lotus-focus inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition-transform hover:-translate-y-px"
          >
            Novo cliente
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {/* KPI bento: 1 hero + 4 secundários */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          label="Clientes ativos"
          value={ativosCount}
          hint={`${total} no total · ${inativosCount} inativos`}
          icon={UserCheck}
          emphasis="hero"
          className="lg:col-span-2"
        />
        <StatCard label="Inativos" value={inativosCount} icon={UserMinus} emphasis="compact" />
        <StatCard label="Serviços ativos" value={servicosCount} icon={Briefcase} emphasis="compact" />
        <StatCard label="Acessos vinculados" value={totalAcessos} icon={Users} emphasis="compact" />
        <StatCard
          label="Última sync"
          value={relTime(ultimaSync ?? null)}
          icon={RadioTower}
          emphasis="compact"
        />
      </section>

      {/* Bento: clientes recentes (grande) + ingestão (compacto) */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lotus-surface lg:col-span-2">
          <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
            <div>
              <h2 className="font-display text-[15px] font-semibold tracking-tight">
                Clientes recém-atualizados
              </h2>
              <p className="text-xs text-muted-foreground">
                Ordenados por última alteração no cadastro
              </p>
            </div>
            <Link
              to="/admin/clientes"
              className="text-[12px] font-medium text-primary-600 hover:underline dark:text-primary-300"
            >
              Ver todos →
            </Link>
          </header>
          <div className="divide-y divide-border/60">
            {recentes.length === 0 && (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                Nenhum cliente cadastrado ainda.
              </p>
            )}
            {recentes.map((c: any) => (
              <Link
                key={c.id}
                to="/admin/clientes/$id"
                params={{ id: String(c.id) }}
                className="lotus-row flex items-center justify-between px-5 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {c.nome_cliente}
                    </span>
                    <span
                      className={
                        c.ativo
                          ? "inline-flex h-1.5 w-1.5 rounded-full bg-success"
                          : "inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/40"
                      }
                    />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.empresa ?? "—"} ·{" "}
                    {(c.servicos ?? []).slice(0, 3).join(", ") || "sem serviços"}
                  </p>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <div>{c.qtd_acessos ?? 0} acessos</div>
                  <div>{relTime(c.updated_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="lotus-surface">
          <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              Ingestão de dados
            </h2>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </header>
          <ul className="divide-y divide-border/60">
            {topAtivos.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">
                Sem dados em <code>base_metricas</code> ainda.
              </li>
            )}
            {topAtivos.map((a) => (
              <li key={a.cliente} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{a.cliente}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {relTime(a.ultima_ingestao)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {(a.plataformas_ativas ?? []).slice(0, 5).map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
