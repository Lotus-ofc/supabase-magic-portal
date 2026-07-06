import type { ContentCardStatus } from "../types/content-card";

export type KanbanColumnConfig = {
  status: ContentCardStatus;
  label: string;
  colorToken: string;
};

/** Colunas Kanban ativas (exclui arquivado — Biblioteca). */
export const KANBAN_COLUMNS: KanbanColumnConfig[] = [
  { status: "producao", label: "Em Produção", colorToken: "--cw-col-producao" },
  { status: "edicao", label: "Em Edição", colorToken: "--cw-col-edicao" },
  {
    status: "aguardando_aprovacao",
    label: "Aguardando Aprovação",
    colorToken: "--cw-col-aguardando",
  },
  { status: "aprovado", label: "Aprovado", colorToken: "--cw-col-aprovado" },
  { status: "publicado", label: "Publicado", colorToken: "--cw-col-publicado" },
];

export function getColumnForStatus(status: ContentCardStatus): KanbanColumnConfig | undefined {
  return KANBAN_COLUMNS.find((c) => c.status === status);
}
