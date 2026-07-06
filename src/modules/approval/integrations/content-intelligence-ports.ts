import type { ContentCard } from "../types/content-card";
import type { LibrarySearchFilters } from "../library/types/library";

export type ContentSearchQuery = LibrarySearchFilters & {
  semantic?: boolean;
};

export type ContentSearchHit = {
  card: ContentCard;
  score?: number;
  highlights?: string[];
};

/** Port para busca inteligente (full-text / semântica). Sem implementação na Fase 4. */
export interface ContentSearchPort {
  search(query: ContentSearchQuery): Promise<{ hits: ContentSearchHit[]; total: number }>;
}

export type ContentRecommendationInput = {
  cadastro_cliente_id: number;
  context?: Record<string, unknown>;
  limit?: number;
};

export type ContentRecommendation = {
  cardId: string;
  reason: string;
  score?: number;
};

/** Port para recomendações editoriais. Sem implementação na Fase 4. */
export interface ContentRecommendationPort {
  recommend(input: ContentRecommendationInput): Promise<ContentRecommendation[]>;
}

export type TrendAnalysisInput = {
  cadastro_cliente_id?: number;
  periodFrom: string;
  periodTo: string;
};

export type TrendInsight = {
  topic: string;
  direction: "up" | "down" | "stable";
  summary: string;
};

/** Port para análise de tendências. Sem implementação na Fase 4. */
export interface TrendAnalysisPort {
  analyze(input: TrendAnalysisInput): Promise<TrendInsight[]>;
}
