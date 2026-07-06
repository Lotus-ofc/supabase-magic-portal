import type {
  AgencyClientCard,
  AgencyExecutiveSummary,
  ContextualKpi,
  MorningBriefing,
  MorningBriefingHighlight,
} from "../types";

const currency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function firstName(emailOrName?: string | null) {
  if (!emailOrName) return "equipe";
  const base = emailOrName.includes("@") ? emailOrName.split("@")[0] : emailOrName;
  return base.split(/[.\s_-]/)[0] ?? base;
}

function timeGreeting(hour: number) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function buildMorningBriefing(input: {
  userDisplayName?: string | null;
  summary: AgencyExecutiveSummary;
  clients: AgencyClientCard[];
  priorityCount?: number;
  topPriorityTitle?: string | null;
  now?: Date;
}): MorningBriefing {
  const now = input.now ?? new Date();
  const greeting = `${timeGreeting(now.getHours())}, ${firstName(input.userDisplayName)}`;
  const lines: string[] = [];
  const highlights: MorningBriefingHighlight[] = [];

  const attentionClients = input.clients.filter(
    (c) => c.health_tier === "attention" || c.health_tier === "critical",
  );

  const priorityCount =
    input.priorityCount ??
    input.clients.filter((c) => c.proxima_acao?.trim()).length;

  if (priorityCount > 0) {
    lines.push(
      `Hoje existem ${priorityCount} prioridade${priorityCount === 1 ? "" : "s"}.`,
    );
    highlights.push({
      id: "priorities",
      text: `${priorityCount} prioridades`,
      filterKey: "section",
      filterValue: "prioridades",
    });
  } else {
    lines.push("Nenhuma prioridade urgente — bom momento para planejar.");
  }

  if (input.topPriorityTitle) {
    lines.push(input.topPriorityTitle);
  }

  if (attentionClients.length > 0) {
    lines.push(
      `${attentionClients.length} cliente${attentionClients.length === 1 ? "" : "s"} aguarda${attentionClients.length === 1 ? "" : "m"} ação.`,
    );
    highlights.push({
      id: "attention",
      text: `${attentionClients.length} precisam de atenção`,
      filterKey: "health",
      filterValue: "attention",
    });
  }

  const negociacao = input.summary.leads_negociacao;
  if (negociacao > 0) {
    lines.push(
      `${negociacao} cliente${negociacao === 1 ? "" : "s"} em negociação.`,
    );
  }

  lines.push(`Sua receita recorrente está em ${currency(input.summary.receita_mensal)}.`);

  const hotClient = input.clients.find((c) => c.status_operacional === "negociacao" && c.proxima_acao);
  if (hotClient?.proxima_acao) {
    lines.push(`${hotClient.nome_cliente}: ${hotClient.proxima_acao}.`);
  }

  return { greeting, lines, highlights };
}

export function buildContextualKpis(summary: AgencyExecutiveSummary): ContextualKpi[] {
  return [
    {
      id: "receita",
      label: "Receita Recorrente",
      value: currency(summary.receita_mensal),
      context: summary.receita_mensal > 0 ? "MRR ativo na carteira" : "Nenhum MRR cadastrado",
      filterKey: "section",
      filterValue: "financeiro",
    },
    {
      id: "clientes",
      label: "Clientes Ativos",
      value: String(summary.clientes_ativos),
      context:
        summary.clientes_atencao > 0
          ? `${summary.clientes_atencao} precisam de atenção`
          : "Carteira saudável",
      filterKey: "health",
      filterValue: summary.clientes_atencao > 0 ? "attention" : undefined,
    },
    {
      id: "projetos",
      label: "Projetos",
      value: String(summary.projetos_andamento),
      context:
        summary.projetos_atrasados > 0
          ? `${summary.projetos_atrasados} atrasados`
          : "Em andamento",
      filterKey: "section",
      filterValue: "projetos",
    },
    {
      id: "leads",
      label: "Leads",
      value: String(summary.leads_negociacao),
      context:
        summary.leads_quentes > 0
          ? `${summary.leads_quentes} muito quente${summary.leads_quentes === 1 ? "" : "s"}`
          : "Em negociação",
      filterKey: "status",
      filterValue: "negociacao",
    },
    {
      id: "campanhas",
      label: "Campanhas",
      value: String(summary.campanhas_ativas),
      context:
        summary.campanhas_pausadas > 0
          ? `${summary.campanhas_pausadas} pausada${summary.campanhas_pausadas === 1 ? "" : "s"}`
          : "Ativas",
      filterKey: "section",
      filterValue: "campanhas",
    },
  ];
}
