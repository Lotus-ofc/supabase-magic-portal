import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgencyExecutiveSummary } from "../types";

const DEFAULT_SUMMARY: AgencyExecutiveSummary = {
  receita_mensal: 0,
  clientes_ativos: 0,
  clientes_atencao: 0,
  clientes_implantacao: 0,
  leads_negociacao: 0,
  projetos_andamento: 0,
  projetos_atrasados: 0,
  campanhas_ativas: 0,
  campanhas_pausadas: 0,
  leads_quentes: 0,
};

export const agencySummaryRepository = {
  async getExecutiveSummary(supabase: SupabaseClient): Promise<AgencyExecutiveSummary> {
    const { data, error } = await supabase
      .from("vw_agency_executive_summary")
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return DEFAULT_SUMMARY;

    const row = data as Record<string, unknown>;
    return {
      receita_mensal: Number(row.receita_mensal ?? 0),
      clientes_ativos: Number(row.clientes_ativos ?? 0),
      clientes_implantacao: Number(row.clientes_implantacao ?? 0),
      clientes_atencao: Number(row.clientes_atencao ?? 0),
      leads_negociacao: Number(row.leads_negociacao ?? 0),
      projetos_andamento: Number(row.projetos_andamento ?? 0),
      projetos_atrasados: Number(row.projetos_atrasados ?? 0),
      campanhas_ativas: Number(row.campanhas_ativas ?? 0),
      campanhas_pausadas: Number(row.campanhas_pausadas ?? 0),
      leads_quentes: Number(row.leads_quentes ?? 0),
    };
  },
};
