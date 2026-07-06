import type { AgencyClientCard } from "../../types";
import type { AgencyLead } from "../../types/leads";
import type { AgencyProject, AgencyTask } from "../../types/operations";
import { analyzeClientHealth } from "../health/analyze-health";
import { daysUntil } from "../../lib/format-time";

export interface AgencySearchResult {
  id: string;
  label: string;
  hint?: string;
  href: string;
  group: string;
}

const COMMAND_ALIASES: Record<string, string> = {
  "clientes criticos": "critical_clients",
  "clientes críticos": "critical_clients",
  "projetos atrasados": "overdue_projects",
  "pagamentos amanha": "payments_tomorrow",
  "pagamentos amanhã": "payments_tomorrow",
  "leads quentes": "hot_leads",
  "pipeline": "pipeline",
};

function normalizeQuery(q: string) {
  return q
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function searchAgencyOs(input: {
  query: string;
  clients: AgencyClientCard[];
  leads: AgencyLead[];
  projects: AgencyProject[];
  tasks: AgencyTask[];
  now?: Date;
}): AgencySearchResult[] {
  const now = input.now ?? new Date();
  const raw = input.query.trim();
  if (!raw) return [];

  const normalized = normalizeQuery(raw);
  const command = COMMAND_ALIASES[normalized];

  if (command === "critical_clients") {
    return input.clients
      .filter((c) => {
        const h = analyzeClientHealth({ client: c, now });
        return h.tier === "critical" || h.tier === "attention";
      })
      .slice(0, 8)
      .map((c) => ({
        id: `client-critical-${c.id}`,
        label: c.nome_cliente,
        hint: "Cliente crítico",
        href: `/admin/central/clientes/${c.id}`,
        group: "Clientes críticos",
      }));
  }

  if (command === "overdue_projects") {
    return input.projects
      .filter(
        (p) =>
          p.status_kanban !== "finalizado" &&
          p.prazo &&
          daysUntil(p.prazo, now) !== null &&
          (daysUntil(p.prazo, now) as number) < 0,
      )
      .slice(0, 8)
      .map((p) => {
        const client = input.clients.find((c) => c.id === p.cadastro_cliente_id);
        return {
          id: `project-${p.id}`,
          label: p.titulo,
          hint: client?.nome_cliente,
          href: `/admin/central/clientes/${p.cadastro_cliente_id}`,
          group: "Projetos atrasados",
        };
      });
  }

  if (command === "payments_tomorrow") {
    return input.leads
      .filter((l) => {
        if (!l.proximo_contato) return false;
        const d = daysUntil(l.proximo_contato, now);
        return d !== null && d <= 1;
      })
      .slice(0, 8)
      .map((l) => ({
        id: `lead-pay-${l.id}`,
        label: l.nome,
        hint: "Contato previsto",
        href: "/admin/central?section=pipeline",
        group: "Pagamentos / contatos",
      }));
  }

  if (command === "hot_leads" || command === "pipeline") {
    return input.leads
      .filter((l) => l.pipeline_stage !== "cliente_ativo")
      .sort((a, b) => b.probabilidade_efetiva - a.probabilidade_efetiva)
      .slice(0, 8)
      .map((l) => ({
        id: `lead-${l.id}`,
        label: l.nome,
        hint: `${l.probabilidade_efetiva}% · ${l.pipeline_stage}`,
        href: "/admin/central?section=pipeline",
        group: "Pipeline",
      }));
  }

  const needle = normalized;
  const results: AgencySearchResult[] = [];

  for (const c of input.clients) {
    const hay = [c.nome_cliente, c.empresa].filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(needle)) {
      results.push({
        id: `client-${c.id}`,
        label: c.nome_cliente,
        hint: c.empresa ?? undefined,
        href: `/admin/central/clientes/${c.id}`,
        group: "Clientes",
      });
    }
  }

  for (const l of input.leads) {
    const hay = [l.nome, l.empresa].filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(needle)) {
      results.push({
        id: `lead-search-${l.id}`,
        label: l.nome,
        hint: l.empresa ?? `Lead · ${l.probabilidade_efetiva}%`,
        href: "/admin/central?section=pipeline",
        group: "Leads",
      });
    }
  }

  return results.slice(0, 12);
}
