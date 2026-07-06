import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyLead, AgencyPipelineStage, PipelineKanbanBoard } from "../types/leads";
import { computeLeadScore } from "../intelligence/leads/score-lead";
import { PIPELINE_COLUMNS } from "../types/leads";

const SELECT =
  "id,nome,empresa,origem,valor_estimado,probabilidade_manual,probabilidade_score,proximo_contato,proxima_acao,ultima_interacao,responsavel_user_id,pipeline_stage,cadastro_cliente_id,kanban_ordem,reunioes_count,interacoes_count,notas,converted_at,created_at,updated_at";

function mapRow(row: Record<string, unknown>): AgencyLead {
  const lead: AgencyLead = {
    id: row.id as string,
    nome: row.nome as string,
    empresa: (row.empresa as string | null) ?? null,
    origem: row.origem as AgencyLead["origem"],
    valor_estimado: row.valor_estimado != null ? Number(row.valor_estimado) : null,
    probabilidade_manual: row.probabilidade_manual != null ? Number(row.probabilidade_manual) : null,
    probabilidade_score: Number(row.probabilidade_score ?? 30),
    probabilidade_efetiva: 0,
    proximo_contato: (row.proximo_contato as string | null) ?? null,
    proxima_acao: (row.proxima_acao as string | null) ?? null,
    ultima_interacao: (row.ultima_interacao as string | null) ?? null,
    responsavel_user_id: (row.responsavel_user_id as string | null) ?? null,
    pipeline_stage: row.pipeline_stage as AgencyPipelineStage,
    cadastro_cliente_id: row.cadastro_cliente_id != null ? Number(row.cadastro_cliente_id) : null,
    kanban_ordem: Number(row.kanban_ordem ?? 0),
    reunioes_count: Number(row.reunioes_count ?? 0),
    interacoes_count: Number(row.interacoes_count ?? 0),
    notas: (row.notas as string | null) ?? null,
    converted_at: (row.converted_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
  lead.probabilidade_efetiva =
    lead.probabilidade_manual ?? computeLeadScore(lead);
  return lead;
}

export const agencyLeadRepository = {
  async listActive(supabase: SupabaseClient) {
    const { data, error } = await supabase
      .from("agency_leads")
      .select(SELECT)
      .not("pipeline_stage", "eq", "cliente_ativo")
      .order("kanban_ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  },

  async buildPipelineBoard(supabase: SupabaseClient): Promise<PipelineKanbanBoard> {
    const leads = await this.listActive(supabase);
    return {
      columns: PIPELINE_COLUMNS.map((col) => ({
        ...col,
        items: leads
          .filter((l) => l.pipeline_stage === col.id)
          .sort((a, b) => a.kanban_ordem - b.kanban_ordem),
      })),
    };
  },

  async move(
    supabase: SupabaseClient,
    input: { id: string; pipeline_stage: AgencyPipelineStage; kanban_ordem: number },
  ) {
    const score = await supabase
      .from("agency_leads")
      .select(SELECT)
      .eq("id", input.id)
      .maybeSingle();
    if (score.error) throw new Error(score.error.message);
    const lead = score.data ? mapRow(score.data as Record<string, unknown>) : null;
    const probabilidade_score = lead ? computeLeadScore({ ...lead, pipeline_stage: input.pipeline_stage }) : 30;

    const { error } = await supabase
      .from("agency_leads")
      .update({
        pipeline_stage: input.pipeline_stage,
        kanban_ordem: input.kanban_ordem,
        probabilidade_score,
      })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
  },

  async convertToClient(
    supabase: SupabaseClient,
    input: { leadId: string; cadastroClienteId?: number; nomeCliente?: string },
  ) {
    const { data: lead, error: leadErr } = await supabase
      .from("agency_leads")
      .select(SELECT)
      .eq("id", input.leadId)
      .maybeSingle();
    if (leadErr) throw new Error(leadErr.message);
    if (!lead) throw new Error("Lead não encontrado");

    const mapped = mapRow(lead as Record<string, unknown>);
    let clienteId = input.cadastroClienteId ?? mapped.cadastro_cliente_id;

    if (!clienteId) {
      const nome = input.nomeCliente ?? mapped.empresa ?? mapped.nome;
      const { data: created, error: createErr } = await supabase
        .from("cadastro_clientes")
        .insert({
          nome_cliente: nome,
          empresa: mapped.empresa,
          valor_mensal: mapped.valor_estimado,
          status_operacional: "implantacao",
          ativo: true,
        })
        .select("id")
        .single();
      if (createErr) throw new Error(createErr.message);
      clienteId = created.id as number;
    }

    const { error: updateErr } = await supabase
      .from("agency_leads")
      .update({
        cadastro_cliente_id: clienteId,
        pipeline_stage: "cliente_ativo",
        converted_at: new Date().toISOString(),
        probabilidade_score: 100,
      })
      .eq("id", input.leadId);

    if (updateErr) throw new Error(updateErr.message);

    await supabase
      .from("cadastro_clientes")
      .update({ status_operacional: "implantacao" })
      .eq("id", clienteId);

    return { cadastro_cliente_id: clienteId };
  },
};
