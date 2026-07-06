/** Aggregate root — domínio oficial Content Workflow. Tabela: content_cards */

export const CONTENT_CARD_STATUSES = [
  "producao",
  "edicao",
  "aguardando_aprovacao",
  "aprovado",
  "publicado",
  "arquivado",
] as const;

export type ContentCardStatus = (typeof CONTENT_CARD_STATUSES)[number];

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type ContentCard = {
  id: string;
  cadastro_cliente_id: number;
  cliente_nome: string;
  data_publicacao: string;
  hora_publicacao: string | null;
  titulo: string;
  legenda: string | null;
  copy_text: string | null;
  roteiro: string | null;
  direcao_arte: string | null;
  cta: string | null;
  plataforma: string;
  formato: string | null;
  capa_url: string | null;
  status: ContentCardStatus;
  checklist: ChecklistItem[];
  localizacao: string | null;
  tags: string[] | null;
  observacoes: string | null;
  responsavel_email: string | null;
  responsavel_user_id: string | null;
  pilar_id: string | null;
  estrategia_id: string | null;
  kanban_ordem: number;
  published_at: string | null;
  archived_at: string | null;
  ai_metadata: Record<string, unknown>;
  integration_metadata: Record<string, unknown>;
  legacy_post_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentCardInsert = Omit<
  ContentCard,
  "id" | "created_at" | "updated_at" | "published_at" | "archived_at"
> & {
  id?: string;
};

export type ContentCardUpdate = Partial<
  Omit<ContentCard, "id" | "created_at" | "updated_at" | "cadastro_cliente_id" | "cliente_nome">
>;
