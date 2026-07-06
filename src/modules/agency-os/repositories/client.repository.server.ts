import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyCentralFilters, AgencyClientCard } from "../types";

const CLIENT_CARD_SELECT =
  "id,nome_cliente,slug,ativo,empresa,valor_mensal,categoria,status_operacional,prioridade,proxima_acao,responsavel_user_id,ultimo_contato,proxima_reuniao,observacoes,data_inicio,avatar_url,email_principal,telefone,servicos,tags,health_tier";

function mapRow(row: Record<string, unknown>): AgencyClientCard {
  return {
    id: row.id as number,
    nome_cliente: row.nome_cliente as string,
    slug: (row.slug as string | null) ?? null,
    ativo: Boolean(row.ativo),
    empresa: (row.empresa as string | null) ?? null,
    valor_mensal: row.valor_mensal != null ? Number(row.valor_mensal) : null,
    categoria: (row.categoria as string | null) ?? null,
    status_operacional: row.status_operacional as AgencyClientCard["status_operacional"],
    prioridade: row.prioridade as AgencyClientCard["prioridade"],
    proxima_acao: (row.proxima_acao as string | null) ?? null,
    responsavel_user_id: (row.responsavel_user_id as string | null) ?? null,
    ultimo_contato: (row.ultimo_contato as string | null) ?? null,
    proxima_reuniao: (row.proxima_reuniao as string | null) ?? null,
    observacoes: (row.observacoes as string | null) ?? null,
    data_inicio: (row.data_inicio as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    email_principal: (row.email_principal as string | null) ?? null,
    telefone: (row.telefone as string | null) ?? null,
    servicos: (row.servicos as string[] | null) ?? [],
    tags: (row.tags as string[] | null) ?? [],
    health_tier: row.health_tier as AgencyClientCard["health_tier"],
  };
}

export const agencyClientRepository = {
  async list(supabase: SupabaseClient, filters: AgencyCentralFilters = {}) {
    let query = supabase.from("vw_agency_client_cards").select(CLIENT_CARD_SELECT).eq("ativo", true);

    if (filters.clienteId) query = query.eq("id", filters.clienteId);
    if (filters.responsavelId) query = query.eq("responsavel_user_id", filters.responsavelId);
    if (filters.status) query = query.eq("status_operacional", filters.status);
    if (filters.prioridade) query = query.eq("prioridade", filters.prioridade);
    if (filters.health) query = query.eq("health_tier", filters.health);
    if (filters.servico) query = query.contains("servicos", [filters.servico]);
    query = query.order("prioridade", { ascending: true }).order("nome_cliente", { ascending: true });

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    let rows = (data ?? []).map((row) => mapRow(row as Record<string, unknown>));

    if (filters.search?.trim()) {
      const q = filters.search.trim().toLowerCase();
      rows = rows.filter(
        (c) =>
          c.nome_cliente.toLowerCase().includes(q) ||
          (c.empresa?.toLowerCase().includes(q) ?? false),
      );
    }

    return rows;
  },

  async getById(supabase: SupabaseClient, id: number) {
    const { data, error } = await supabase
      .from("vw_agency_client_cards")
      .select(CLIENT_CARD_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapRow(data as Record<string, unknown>) : null;
  },

  async updateOperational(
    supabase: SupabaseClient,
    input: {
      id: number;
      proxima_acao?: string | null;
      status_operacional?: AgencyClientCard["status_operacional"];
      prioridade?: AgencyClientCard["prioridade"];
    },
  ) {
    const payload: Record<string, unknown> = {};
    if (input.proxima_acao !== undefined) payload.proxima_acao = input.proxima_acao;
    if (input.status_operacional !== undefined) payload.status_operacional = input.status_operacional;
    if (input.prioridade !== undefined) payload.prioridade = input.prioridade;

    const { error } = await supabase.from("cadastro_clientes").update(payload).eq("id", input.id);
    if (error) throw new Error(error.message);
  },
};
