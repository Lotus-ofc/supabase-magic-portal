import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useCallback, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  DollarSign,
  Users,
  FolderKanban,
  Target,
  Radio,
} from "lucide-react";
import { adminTitle } from "@/lib/brand";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { SectionCard } from "@/components/lotus/SectionCard";
import { SmartBriefing } from "@/components/lotus/agency-os/SmartBriefing";
import { ContextualKpiCard } from "@/components/lotus/agency-os/ContextualKpiCard";
import { IntelligentFeed } from "@/components/lotus/agency-os/IntelligentFeed";
import { ClientOperationalCard } from "@/components/lotus/agency-os/ClientOperationalCard";
import { AgencyFilterBar } from "@/components/lotus/agency-os/AgencyFilterBar";
import { AddNoteDialog } from "@/components/lotus/agency-os/AddNoteDialog";
import { PrioritiesSection, prioritiesQuery } from "@/components/lotus/agency-os/PrioritiesSection";
import {
  ProductionKanbanSection,
  productionKanbanQuery,
} from "@/components/lotus/agency-os/ProductionKanbanSection";
import {
  PipelineKanbanSection,
  pipelineQuery,
} from "@/components/lotus/agency-os/PipelineKanbanSection";
import { addAgencyNote, getAgencyCentral } from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";
import type { AgencyCentralFilters, AgencyClientCard, ContextualKpi } from "@/modules/agency-os";
import { listServicos } from "@/lib/admin.functions";

const centralSearchSchema = z.object({
  status: z.enum(["ativo", "implantacao", "negociacao", "pausado", "atencao"]).optional(),
  prioridade: z.enum(["A", "B", "C", "D"]).optional(),
  health: z.enum(["excellent", "good", "attention", "critical"]).optional(),
  servico: z.string().optional(),
  search: z.string().optional(),
  section: z.string().optional(),
});

const KPI_ICONS = {
  receita: DollarSign,
  clientes: Users,
  projetos: FolderKanban,
  leads: Target,
  campanhas: Radio,
} as const;

function filtersFromSearch(search: z.infer<typeof centralSearchSchema>): AgencyCentralFilters {
  return {
    status: search.status,
    prioridade: search.prioridade,
    health: search.health,
    servico: search.servico,
    search: search.search,
  };
}

function centralQuery(filters: AgencyCentralFilters) {
  return queryOptions({
    queryKey: agencyOsKeys.central(filters),
    queryFn: () => getAgencyCentral({ data: filters }),
  });
}

const servicosQuery = queryOptions({
  queryKey: ["admin", "servicos"],
  queryFn: () => listServicos(),
});

export const Route = createFileRoute("/_authenticated/admin/central")({
  head: () => ({ meta: [{ title: adminTitle("Central") }] }),
  validateSearch: centralSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    const filters = filtersFromSearch(deps);
    const qc = context.queryClient;
    return Promise.all([
      qc.ensureQueryData(centralQuery(filters)),
      qc.ensureQueryData(servicosQuery),
      qc.ensureQueryData(prioritiesQuery),
      qc.ensureQueryData(productionKanbanQuery),
      qc.ensureQueryData(pipelineQuery),
    ]);
  },
  component: CentralPage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
});

function CentralPage() {
  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={5} charts={0} />}>
      <CentralContent />
    </Suspense>
  );
}

function CentralContent() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const filters = useMemo(() => filtersFromSearch(search), [search]);
  const { data } = useSuspenseQuery(centralQuery(filters));
  const { data: servicosData } = useSuspenseQuery(servicosQuery);

  const [noteClient, setNoteClient] = useState<AgencyClientCard | null>(null);

  const briefing = data.intelligence?.briefing ?? data.briefing;

  const setFilters = useCallback(
    (next: AgencyCentralFilters) => {
      navigate({
        search: {
          status: next.status,
          prioridade: next.prioridade,
          health: next.health,
          servico: next.servico,
          search: next.search,
          section: search.section,
        },
        replace: true,
      });
    },
    [navigate, search.section],
  );

  const applyKpiFilter = useCallback(
    (kpi: ContextualKpi) => {
      if (!kpi.filterKey || !kpi.filterValue) return;
      if (kpi.filterKey === "health") {
        setFilters({ ...filters, health: "attention" });
        return;
      }
      if (kpi.filterKey === "status") {
        setFilters({ ...filters, status: kpi.filterValue as AgencyCentralFilters["status"] });
        return;
      }
      if (kpi.filterKey === "section") {
        navigate({ search: { ...search, section: kpi.filterValue }, replace: true });
        document.getElementById(`agency-section-${kpi.filterValue}`)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    },
    [filters, navigate, search, setFilters],
  );

  const addNoteMutation = useMutation({
    mutationFn: (input: { cadastro_cliente_id: number; body: string }) =>
      addAgencyNote({ data: input }),
    onSuccess: async () => {
      toast.success("Observação registrada");
      setNoteClient(null);
      await qc.invalidateQueries({ queryKey: agencyOsKeys.all });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha ao salvar"),
  });

  const servicoNames = useMemo(
    () => [...new Set((servicosData ?? []).map((s: { nome: string }) => s.nome))].sort(),
    [servicosData],
  );

  const showPriorities = !search.section || search.section === "prioridades";
  const showPipeline = !search.section || search.section === "pipeline";
  const showProducao = !search.section || search.section === "projetos" || search.section === "producao";
  const showClients =
    !search.section || search.section === "clientes" || search.section === "financeiro";

  return (
    <div className="space-y-8 pb-10">
      <SmartBriefing briefing={briefing} />

      <section aria-label="Indicadores executivos">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {data.kpis.map((kpi) => (
            <ContextualKpiCard
              key={kpi.id}
              label={kpi.label}
              value={kpi.value}
              context={kpi.context}
              icon={KPI_ICONS[kpi.id as keyof typeof KPI_ICONS]}
              onClick={
                kpi.filterKey && kpi.filterValue ? () => applyKpiFilter(kpi) : undefined
              }
            />
          ))}
        </div>
      </section>

      {showPriorities && (
        <div id="agency-section-prioridades">
          <SectionCard
            title="Prioridades de hoje"
            description="O que merece sua atenção agora — ordenado por impacto."
            eyebrow="Motor operacional"
          >
            <PrioritiesSection />
          </SectionCard>
        </div>
      )}

      <SectionCard
        title="Atividade recente"
        description="Eventos priorizados — críticos primeiro, sem spam."
        eyebrow="Feed inteligente"
      >
        <IntelligentFeed rankedFeed={data.intelligence?.globalFeed} events={data.feed} />
      </SectionCard>

      <AgencyFilterBar filters={filters} onChange={setFilters} servicos={servicoNames} />

      {showPipeline && (
        <div id="agency-section-pipeline">
          <SectionCard
            title="Pipeline comercial"
            description="Leads com score automático — probabilidade calculada pelo sistema."
            eyebrow="Inteligência"
          >
            <Suspense fallback={<DashboardSkeleton kpiCount={0} charts={1} />}>
              <PipelineKanbanSection />
            </Suspense>
          </SectionCard>
        </div>
      )}

      {showProducao && (
        <div id="agency-section-producao">
          <SectionCard
            title="Produção"
            description="Kanban de entregas em andamento"
            eyebrow="Workspace"
          >
            <Suspense fallback={<DashboardSkeleton kpiCount={0} charts={1} />}>
              <ProductionKanbanSection />
            </Suspense>
          </SectionCard>
        </div>
      )}

      {showClients && (
        <div id="agency-section-clientes">
          <SectionCard
            title="Clientes"
            description={`${data.clients.length} na carteira operacional`}
            eyebrow="Workspace"
          >
            {data.clients.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum cliente corresponde aos filtros atuais.
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.clients.map((client) => (
                  <ClientOperationalCard
                    key={client.id}
                    client={client}
                    onAddNote={setNoteClient}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      )}

      <AddNoteDialog
        client={noteClient}
        open={Boolean(noteClient)}
        onOpenChange={(open) => !open && setNoteClient(null)}
        isPending={addNoteMutation.isPending}
        onSubmit={(body) => {
          if (!noteClient) return;
          addNoteMutation.mutate({ cadastro_cliente_id: noteClient.id, body });
        }}
      />
    </div>
  );
}
