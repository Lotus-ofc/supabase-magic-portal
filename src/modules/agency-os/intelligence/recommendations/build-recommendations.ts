import type { AgencyClientCard } from "../../types";
import type { AgencyLead } from "../../types/leads";
import type { AgencyProject, AgencyTask } from "../../types/operations";
import type { OperationalPriority } from "../../priority-engine/types";
import type { AgencyRecommendation } from "../types";
import { daysUntil } from "../../lib/format-time";
import { analyzeClientHealth } from "../health/analyze-health";

export function buildAgencyRecommendations(input: {
  clients: AgencyClientCard[];
  leads: AgencyLead[];
  tasks: AgencyTask[];
  projects: AgencyProject[];
  priorities: OperationalPriority[];
  now?: Date;
}): AgencyRecommendation[] {
  const now = input.now ?? new Date();
  const recs: AgencyRecommendation[] = [];

  for (const client of input.clients) {
    const diagnosis = analyzeClientHealth({
      client,
      tasks: input.tasks.filter((t) => t.cadastro_cliente_id === client.id),
      projects: input.projects.filter((p) => p.cadastro_cliente_id === client.id),
      now,
    });

    for (const r of diagnosis.recommendations) {
      recs.push({
        id: `client:${client.id}:${r.id}`,
        type: r.actionType,
        title: r.label,
        description: `Para ${client.nome_cliente}`,
        clienteId: client.id,
        clienteNome: client.nome_cliente,
        actionHref: `/admin/central/clientes/${client.id}`,
        actionLabel: "Abrir workspace",
        priority: r.priority === "high" ? 90 : r.priority === "medium" ? 60 : 30,
      });
    }
  }

  for (const lead of input.leads) {
    if (lead.probabilidade_efetiva >= 80) {
      recs.push({
        id: `lead:hot:${lead.id}`,
        type: "call",
        title: "Sugerir ligação hoje",
        description: `${lead.nome} — ${lead.probabilidade_efetiva}% de fechamento`,
        leadId: lead.id,
        actionHref: "/admin/central?section=pipeline",
        actionLabel: "Ver pipeline",
        priority: 95,
      });
    }
    if (lead.proximo_contato) {
      const days = daysUntil(lead.proximo_contato, now);
      if (days !== null && days <= 1) {
        recs.push({
          id: `lead:contact:${lead.id}`,
          type: "follow_up",
          title: "Follow-up de lead",
          description: `${lead.nome} — contato ${days === 0 ? "hoje" : "amanhã"}`,
          leadId: lead.id,
          actionHref: "/admin/central?section=pipeline",
          actionLabel: "Abrir lead",
          priority: 85,
        });
      }
    }
  }

  for (const p of input.priorities.filter((x) => x.diasAtraso > 0).slice(0, 5)) {
    recs.push({
      id: `priority:${p.id}`,
      type: "priority",
      title: p.titulo,
      description: `${p.clienteNome} — atrasado`,
      clienteId: p.clienteId,
      clienteNome: p.clienteNome,
      actionHref: `/admin/central/clientes/${p.clienteId}`,
      actionLabel: "Resolver",
      priority: p.scoreFinal,
    });
  }

  return [...recs].sort((a, b) => b.priority - a.priority).slice(0, 12);
}
