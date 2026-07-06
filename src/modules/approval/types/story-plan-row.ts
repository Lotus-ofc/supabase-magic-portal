import type { ChecklistItem } from "./content-card";

export type StoryPlanRow = {
  id: string;
  cadastro_cliente_id: number;
  card_id: string | null;
  semana_inicio: string;
  dia_semana: number;
  periodo: string | null;
  titulo: string | null;
  observacoes: string | null;
  checklist: ChecklistItem[];
  ordem: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type StoryPlanRowInsert = Omit<StoryPlanRow, "id" | "created_at" | "updated_at"> & {
  id?: string;
};
