import { adminTitle } from "@/lib/brand";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listClientes } from "@/lib/admin.functions";
import {
  getKanbanBoard,
  moveCard,
  listEditorialPillars,
} from "@/modules/approval/cards/cards.server";
import { buildPillarMap } from "@/modules/approval/services/group-cards-by-date";
import { KanbanBoardView } from "@/components/lotus/approval/kanban/KanbanBoard";
import { CardDetailDrawer } from "@/components/lotus/approval/card/CardDetailDrawer";
import { CardCreateSheet } from "@/components/lotus/approval/card/CardCreateSheet";
import {
  ApprovalWorkspaceTabs,
  type ApprovalTab,
} from "@/components/lotus/approval/shared/ApprovalWorkspaceTabs";
import { ApprovalCalendar } from "@/components/lotus/approval/calendar/ApprovalCalendar";
import { EditorialPillarsPanel } from "@/components/lotus/approval/pillars/EditorialPillarsPanel";
import { StoryPlanSheet } from "@/components/lotus/approval/stories/StoryPlanSheet";
import { LibraryPanel } from "@/components/lotus/approval/library/LibraryPanel";
import type { ContentCardStatus } from "@/modules/approval/types/content-card";

function invalidateApprovalViews(
  qc: ReturnType<typeof useQueryClient>,
  clienteId: number,
  cardId?: string,
) {
  if (cardId) qc.invalidateQueries({ queryKey: ["content-card", cardId] });
  qc.invalidateQueries({ queryKey: ["approval", "kanban", clienteId] });
  qc.invalidateQueries({ queryKey: ["approval", "calendar", clienteId] });
  qc.invalidateQueries({ queryKey: ["editorial-pillars", clienteId] });
  qc.invalidateQueries({ queryKey: ["story-plan", clienteId] });
  qc.invalidateQueries({ queryKey: ["approval", "library", clienteId] });
  qc.invalidateQueries({ queryKey: ["approval", "ops-dashboard"] });
}

export const Route = createFileRoute("/_authenticated/admin/aprovacoes")({
  head: () => ({ meta: [{ title: adminTitle("Aprovações") }] }),
  component: AprovacoesAdminPage,
});

function AprovacoesAdminPage() {
  const qc = useQueryClient();
  const listClientesFn = useServerFn(listClientes);
  const boardFn = useServerFn(getKanbanBoard);
  const moveFn = useServerFn(moveCard);
  const pillarsFn = useServerFn(listEditorialPillars);

  const [clienteId, setClienteId] = useState<string>("");
  const [tab, setTab] = useState<ApprovalTab>("kanban");
  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const clientesQ = useQuery({
    queryKey: ["admin", "clientes"],
    queryFn: () => listClientesFn(),
  });

  const clientes = useMemo(
    () => (clientesQ.data ?? []).filter((c: { ativo?: boolean }) => c.ativo !== false),
    [clientesQ.data],
  );

  const selectedCliente = useMemo(() => {
    const id = Number(clienteId);
    return clientes.find((c: { id: number }) => c.id === id) ?? null;
  }, [clientes, clienteId]);

  const boardQ = useQuery({
    queryKey: ["approval", "kanban", Number(clienteId)],
    queryFn: () => boardFn({ data: { cadastro_cliente_id: Number(clienteId) } }),
    enabled: !!clienteId && tab === "kanban",
  });

  const pillarsQ = useQuery({
    queryKey: ["editorial-pillars", Number(clienteId)],
    queryFn: () =>
      pillarsFn({
        data: { cadastro_cliente_id: Number(clienteId), include_archived: true },
      }),
    enabled: !!clienteId,
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

  const moveMut = useMutation({
    mutationFn: (input: { id: string; status: ContentCardStatus; kanban_ordem: number }) =>
      moveFn({ data: input }),
    onMutate: async (input) => {
      const key = ["approval", "kanban", Number(clienteId)];
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      qc.setQueryData(key, (old: typeof boardQ.data) => {
        if (!old) return old;
        let movedCard = null as (typeof old.columns)[0]["cards"][0] | null;
        const columns = old.columns.map((col) => {
          const filtered = col.cards.filter((c) => {
            if (c.id === input.id) {
              movedCard = { ...c, status: input.status, kanban_ordem: input.kanban_ordem };
              return false;
            }
            return true;
          });
          return { ...col, cards: filtered };
        });
        if (!movedCard) return old;
        return {
          columns: columns.map((col) =>
            col.status === input.status ? { ...col, cards: [...col.cards, movedCard!] } : col,
          ),
        };
      });
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["approval", "kanban", Number(clienteId)], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => {
      if (selectedCliente) invalidateApprovalViews(qc, selectedCliente.id);
    },
  });

  const onCardMutated = () => {
    if (selectedCliente) invalidateApprovalViews(qc, selectedCliente.id, openCardId ?? undefined);
  };

  if (clientesQ.isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operações"
        title="Aprovações"
        description="Planejamento editorial, Kanban e calendário — ambiente interno da agência."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/aprovacoes/dashboard">
                <BarChart3 className="mr-2 h-4 w-4" />
                Dashboard ops
              </Link>
            </Button>
            {selectedCliente && tab === "kanban" ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo card
              </Button>
            ) : null}
          </div>
        }
      />

      <SectionCard title="Cliente" description="Selecione o cliente para carregar o workspace.">
        <Select value={clienteId} onValueChange={setClienteId}>
          <SelectTrigger className="max-w-md">
            <SelectValue placeholder="Selecione um cliente" />
          </SelectTrigger>
          <SelectContent>
            {clientes.map((c: { id: number; nome_cliente: string }) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nome_cliente}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SectionCard>

      {clienteId && <ApprovalWorkspaceTabs value={tab} onChange={setTab} />}

      {!clienteId && (
        <p className="text-sm text-muted-foreground">
          Selecione um cliente para carregar o workspace.
        </p>
      )}

      {clienteId && tab === "kanban" && boardQ.isLoading && <DashboardSkeleton />}

      {clienteId && tab === "kanban" && boardQ.data && (
        <KanbanBoardView
          board={boardQ.data}
          pillarMap={pillarMap}
          thumbMap={thumbMap}
          onMoveCard={(input) => moveMut.mutate(input)}
          onOpenCard={setOpenCardId}
        />
      )}

      {clienteId && tab === "calendar" && (
        <ApprovalCalendar
          cadastroClienteId={Number(clienteId)}
          pillarMap={pillarMap}
          onOpenCard={setOpenCardId}
        />
      )}

      {clienteId && tab === "pillars" && (
        <EditorialPillarsPanel cadastroClienteId={Number(clienteId)} />
      )}

      {clienteId && tab === "stories" && (
        <StoryPlanSheet cadastroClienteId={Number(clienteId)} onOpenCard={setOpenCardId} />
      )}

      {clienteId && tab === "library" && <LibraryPanel cadastroClienteId={Number(clienteId)} />}

      {openCardId && selectedCliente && (
        <CardDetailDrawer
          cardId={openCardId}
          cadastroClienteId={selectedCliente.id}
          onClose={() => setOpenCardId(null)}
          onMutated={onCardMutated}
        />
      )}

      {createOpen && selectedCliente && (
        <CardCreateSheet
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          cliente={selectedCliente}
          onCreated={() => onCardMutated()}
        />
      )}
    </div>
  );
}
