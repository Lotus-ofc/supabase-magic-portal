import type { ContentCard } from "../../types/content-card";

export type LibraryViewMode = "grid" | "list";

export type LibraryStatusFilter = "all" | "publicado" | "arquivado";

export type LibrarySearchFilters = {
  q?: string;
  cadastro_cliente_id?: number;
  pilar_id?: string;
  plataforma?: string;
  formato?: string;
  status?: LibraryStatusFilter;
  year?: number;
  month?: number;
  tags?: string[];
  limit?: number;
  offset?: number;
};

export type LibrarySearchResult = {
  items: ContentCard[];
  total: number;
  limit: number;
  offset: number;
};

export type LibraryItemDetail = {
  card: ContentCard;
  pillar: { id: string; titulo: string; objetivo: string | null; cor: string } | null;
  attachments: { id: string; url: string; mime_type: string; file_name: string }[];
};
