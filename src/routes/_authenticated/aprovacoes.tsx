import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { brandTitle } from "@/lib/brand";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { EmptyState } from "@/components/lotus/EmptyState";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { KanbanBoardView } from "@/components/lotus/approval/kanban/KanbanBoard";
import { ClientCardDetailDrawer } from "@/components/lotus/approval/card/ClientCardDetailDrawer";
import {
  checkClientPortalAccess,
  getClientKanbanBoardFn,
} from "@/modules/approval/cards/client-cards.server";
import { listClientEditorialPillars } from "@/modules/approval/planning/client-planning.server";
import { buildPillarMap } from "@/modules/approval/services/group-cards-by-date";
import {
  ApprovalWorkspaceTabs,
  type ApprovalTab,
} from "@/components/lotus/approval/shared/ApprovalWorkspaceTabs";
import { ApprovalCalendar } from "@/components/lotus/approval/calendar/ApprovalCalendar";
import { EditorialPillarsPanel } from "@/components/lotus/approval/pillars/EditorialPillarsPanel";
import { StoryPlanSheet } from "@/components/lotus/approval/stories/StoryPlanSheet";
import { LibraryPanel } from "@/components/lotus/approval/library/LibraryPanel";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/aprovacoes")({
  head: () => ({ meta: [{ title: brandTitle("Aprovações") }] }),
  component: AprovacoesClientePage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
});

function invalidateClientViews(qc: ReturnType<typeof useQueryClient>, cardId?: string) {
  if (cardId) qc.invalidateQueries({ queryKey: ["client-content-card", cardId] });
  qc.invalidateQueries({ queryKey: ["client-aprovacoes", "kanban"] });
  qc.invalidateQueries({ queryKey: ["approval", "calendar", "client"] });
  qc.invalidateQueries({ queryKey: ["editorial-pillars", "client"] });
  qc.invalidateQueries({ queryKey: ["story-plan", "client"] });
  qc.invalidateQueries({ queryKey: ["approval", "library", "client"] });
}

function AprovacoesClientePage() {
  const qc = useQueryClient();
  const accessFn = useServerFn(checkClientPortalAccess);
  const boardFn = useServerFn(getClientKanbanBoardFn);
  const pillarsFn = useServerFn(listClientEditorialPillars);
  const [tab, setTab] = useState<ApprovalTab>("kanban");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const accessQ = useQuery({
    queryKey: ["client-aprovacoes", "access"],
    queryFn: () => accessFn(),
  });

  const boardQ = useQuery({
    queryKey: ["client-aprovacoes", "kanban"],
    queryFn: () => boardFn(),
    enabled: accessQ.data?.role === "cliente" && tab === "kanban",
  });

  const pillarsQ = useQuery({
    queryKey: ["editorial-pillars", "client"],
    queryFn: () => pillarsFn(),
    enabled: accessQ.data?.role === "cliente",
  });

  const pillarMap = useMemo(() => buildPillarMap(pillarsQ.data ?? []), [pillarsQ.data]);

  const thumbMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    if (!boardQ.data) return map;
    for (const col of boardQ.data.columns) {
      for (const card of col.cards) {
        map[card.id] = card.capa_url;
      }
    }
    return map;
  }, [boardQ.data]);

  const totalCards = useMemo(
    () => boardQ.data?.columns.reduce((sum, col) => sum + col.cards.length, 0) ?? 0,
    [boardQ.data],
  );

  if (accessQ.isLoading) return <DashboardSkeleton kpiCount={0} withChart={false} />;

  if (accessQ.data?.role === "staff_redirect") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Conteúdo"
          title="Aprovações"
          description="Este ambiente é destinado a clientes. Use o painel administrativo para produção."
        />
        <SectionCard title="Acesso administrativo">
          <p className="mb-4 text-sm text-muted-foreground">
            Você está autenticado como equipe interna. O Kanban de produção fica em Aprovações
            (admin).
          </p>
          <Button asChild>
            <Link to="/admin/aprovacoes">Ir para Aprovações (admin)</Link>
          </Button>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Conteúdo"
        title="Aprovações"
        description="Estratégia editorial, calendário e pipeline de aprovação — somente leitura."
      />

      <ApprovalWorkspaceTabs value={tab} onChange={setTab} />

      {tab === "kanban" && boardQ.isLoading && <DashboardSkeleton kpiCount={0} withChart={false} />}

      {tab === "kanban" && !boardQ.isLoading && totalCards === 0 && (
        <SectionCard eyebrow="Workflow" title="Seu pipeline">
          <EmptyState
            icon={ClipboardList}
            title="Nenhum conteúdo no momento"
            description="Quando a agência enviar materiais para aprovação, eles aparecerão aqui no Kanban."
          />
        </SectionCard>
      )}

      {tab === "kanban" && boardQ.data && totalCards > 0 && (
        <KanbanBoardView
          board={boardQ.data}
          pillarMap={pillarMap}
          thumbMap={thumbMap}
          onOpenCard={setOpenCardId}
          readOnly
        />
      )}

      {tab === "calendar" && (
        <ApprovalCalendar pillarMap={pillarMap} onOpenCard={setOpenCardId} readOnly clientMode />
      )}

      {tab === "pillars" && <EditorialPillarsPanel readOnly clientMode />}

      {tab === "stories" && <StoryPlanSheet readOnly clientMode onOpenCard={setOpenCardId} />}

      {tab === "library" && <LibraryPanel readOnly clientMode />}

      {openCardId && (
        <ClientCardDetailDrawer
          cardId={openCardId}
          onClose={() => setOpenCardId(null)}
          onMutated={() => invalidateClientViews(qc, openCardId)}
        />
      )}
    </div>
  );
}
