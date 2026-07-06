import type { AgencyClientCard } from "../../types";
import { computeClientHealth } from "../../services/compute-client-health";
import type { AgencyTask } from "../../types/operations";
import type { RawPriorityCandidate } from "../types";

function clientContext(client: AgencyClientCard) {
  const health = computeClientHealth(client);
  return {
    clienteId: client.id,
    clienteNome: client.nome_cliente,
    healthTier: health.tier,
    healthScore: health.score,
    clientPriority: client.prioridade,
    clientMrr: client.valor_mensal,
  };
}

export function tasksToCandidates(
  tasks: AgencyTask[],
  clientMap: Map<number, AgencyClientCard>,
): RawPriorityCandidate[] {
  return tasks
    .filter((t) => t.status === "open")
    .map((task) => {
      const client = clientMap.get(task.cadastro_cliente_id);
      if (!client) return null;
      const ctx = clientContext(client);
      const prazo = task.due_at ?? task.agenda_date;
      return {
        type: "task" as const,
        sourceId: task.id,
        origem: "agency_tasks",
        titulo: task.titulo,
        descricao: task.descricao,
        responsavelUserId: task.responsavel_user_id,
        responsavelLabel: null,
        prazo,
        status: "open" as const,
        valorRelacionado: null,
        progress: undefined,
        updatedAt: task.updated_at,
        primaryAction: { id: "complete", label: "Concluir", variant: "primary" as const },
        quickActions: [{ id: "open_client", label: "Abrir cliente" }],
        ...ctx,
      };
    })
    .filter(Boolean) as RawPriorityCandidate[];
}

export function clientSignalsToCandidates(
  clients: AgencyClientCard[],
  now = new Date(),
): RawPriorityCandidate[] {
  const out: RawPriorityCandidate[] = [];
  const today = now.toISOString().slice(0, 10);

  for (const client of clients) {
    const ctx = clientContext(client);

    if (client.proxima_acao?.trim()) {
      out.push({
        type: "client_action",
        sourceId: `action-${client.id}`,
        origem: "cadastro_clientes",
        titulo: client.proxima_acao,
        descricao: "Próxima ação registrada",
        responsavelUserId: client.responsavel_user_id,
        responsavelLabel: null,
        prazo: today,
        status: "open",
        valorRelacionado: client.valor_mensal,
        updatedAt: client.updated_at,
        primaryAction: { id: "open_client", label: "Abrir", variant: "primary" },
        ...ctx,
      });
    }

    if (client.proxima_reuniao) {
      const meetingDate = client.proxima_reuniao.slice(0, 10);
      out.push({
        type: "meeting",
        sourceId: `meeting-${client.id}`,
        origem: "cadastro_clientes",
        titulo: "Reunião agendada",
        descricao: `Com ${client.nome_cliente}`,
        responsavelUserId: client.responsavel_user_id,
        responsavelLabel: null,
        prazo: meetingDate,
        status: "open",
        valorRelacionado: null,
        updatedAt: client.updated_at,
        primaryAction: { id: "open_client", label: "Ver cliente" },
        ...ctx,
      });
    }

    if (client.status_operacional === "negociacao") {
      out.push({
        type: "lead",
        sourceId: `lead-${client.id}`,
        origem: "cadastro_clientes",
        titulo: "Lead em negociação",
        descricao: client.empresa ?? client.nome_cliente,
        responsavelUserId: client.responsavel_user_id,
        responsavelLabel: null,
        prazo: client.proxima_reuniao?.slice(0, 10) ?? null,
        status: "in_progress",
        valorRelacionado: client.valor_mensal,
        updatedAt: client.updated_at,
        primaryAction: { id: "open_client", label: "Acompanhar" },
        ...ctx,
      });
    }
  }

  return out;
}

export function projectsToCandidates(
  projects: import("../../types/operations").AgencyProject[],
  clientMap: Map<number, AgencyClientCard>,
): RawPriorityCandidate[] {
  return projects
    .filter((p) => p.status_kanban !== "finalizado")
    .map((project) => {
      const client = clientMap.get(project.cadastro_cliente_id);
      if (!client) return null;
      const ctx = clientContext(client);
      const progress = Array.isArray(project.checklist)
        ? Math.round(
            (project.checklist.filter((i) => i.done).length /
              Math.max(project.checklist.length, 1)) *
              100,
          )
        : 0;
      return {
        type: "project" as const,
        sourceId: project.id,
        origem: "agency_projects",
        titulo: project.titulo,
        descricao: project.etiqueta ?? project.tipo,
        responsavelUserId: project.responsavel_user_id,
        responsavelLabel: null,
        prazo: project.prazo,
        status: project.status_kanban === "revisao" ? ("in_progress" as const) : ("open" as const),
        valorRelacionado: client.valor_mensal,
        progress,
        updatedAt: project.updated_at,
        primaryAction: { id: "open_kanban", label: "Ver produção" },
        quickActions: [{ id: "open_client", label: "Workspace" }],
        ...ctx,
      };
    })
    .filter(Boolean) as RawPriorityCandidate[];
}
