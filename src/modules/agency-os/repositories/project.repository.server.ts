import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AgencyProject,
  AgencyProjectStatus,
  ChecklistItem,
  ProductionKanbanBoard,
} from "../types/operations";

const SELECT =
  "id,cadastro_cliente_id,titulo,tipo,status_kanban,prioridade,etiqueta,prazo,responsavel_user_id,checklist,kanban_ordem,created_at,updated_at";

const COLUMN_LABELS: Record<AgencyProjectStatus, string> = {
  producao: "Em Produção",
  revisao: "Em Revisão",
  finalizado: "Finalizado",
};

function parseChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, i) => {
    if (typeof item !== "object" || !item) {
      return { id: String(i), label: String(item), done: false };
    }
    const o = item as Record<string, unknown>;
    return {
      id: String(o.id ?? i),
      label: String(o.label ?? o.text ?? "Item"),
      done: Boolean(o.done),
    };
  });
}

function mapRow(row: Record<string, unknown>): AgencyProject {
  return {
    id: row.id as string,
    cadastro_cliente_id: row.cadastro_cliente_id as number,
    titulo: row.titulo as string,
    tipo: row.tipo as AgencyProject["tipo"],
    status_kanban: row.status_kanban as AgencyProjectStatus,
    prioridade: row.prioridade as AgencyProject["prioridade"],
    etiqueta: (row.etiqueta as string | null) ?? null,
    prazo: (row.prazo as string | null) ?? null,
    responsavel_user_id: (row.responsavel_user_id as string | null) ?? null,
    checklist: parseChecklist(row.checklist),
    kanban_ordem: Number(row.kanban_ordem ?? 0),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export const agencyProjectRepository = {
  async listActive(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from("agency_projects")
      .select(SELECT)
      .neq("status_kanban", "finalizado")
      .order("kanban_ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  },

  async listByClient(supabase: SupabaseClient, clienteId: number) {
    const { data, error } = await supabase
      .from("agency_projects")
      .select(SELECT)
      .eq("cadastro_cliente_id", clienteId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  },

  async buildKanbanBoard(supabase: SupabaseClient): Promise<ProductionKanbanBoard> {
    const { data, error } = await supabase
      .from("agency_projects")
      .select(SELECT)
      .neq("status_kanban", "finalizado")
      .order("kanban_ordem", { ascending: true });
    if (error) throw new Error(error.message);

    const projects = (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
    const statuses: AgencyProjectStatus[] = ["producao", "revisao", "finalizado"];

    return {
      columns: statuses
        .filter((s) => s !== "finalizado")
        .map((status) => ({
          id: status,
          label: COLUMN_LABELS[status],
          items: projects.filter((p) => p.status_kanban === status),
        })),
    };
  },

  async move(
    supabase: SupabaseClient,
    input: { id: string; status_kanban: AgencyProjectStatus; kanban_ordem: number },
  ) {
    const { error } = await supabase
      .from("agency_projects")
      .update({
        status_kanban: input.status_kanban,
        kanban_ordem: input.kanban_ordem,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  },

  async create(
    supabase: SupabaseClient,
    input: {
      cadastro_cliente_id: number;
      titulo: string;
      tipo?: AgencyProject["tipo"];
      prioridade?: AgencyProject["prioridade"];
      etiqueta?: string | null;
      prazo?: string | null;
      created_by?: string | null;
    },
  ) {
    const { count, error: countErr } = await supabase
      .from("agency_projects")
      .select("id", { count: "exact", head: true })
      .eq("status_kanban", "producao");
    if (countErr) throw new Error(countErr.message);

    const { data, error } = await supabase
      .from("agency_projects")
      .insert({
        cadastro_cliente_id: input.cadastro_cliente_id,
        titulo: input.titulo,
        tipo: input.tipo ?? "outro",
        prioridade: input.prioridade ?? "C",
        etiqueta: input.etiqueta ?? null,
        prazo: input.prazo ?? null,
        status_kanban: "producao",
        kanban_ordem: count ?? 0,
        created_by: input.created_by ?? null,
      })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data as Record<string, unknown>);
  },
};
