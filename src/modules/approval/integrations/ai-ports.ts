import type { ContentCard } from "../types/content-card";

export type ContentAiSuggestion = {
  field: keyof Pick<ContentCard, "legenda" | "copy_text" | "roteiro" | "cta" | "titulo">;
  text: string;
  confidence?: number;
};

export type ContentAiAnalyzeInput = {
  cardId: string;
  fields?: Array<keyof ContentCard>;
};

/** Port para provedores de IA (copy, roteiro, análise). Sem implementação na Fase 0. */
export interface ContentAiPort {
  suggestCopy(input: ContentAiAnalyzeInput): Promise<ContentAiSuggestion[]>;
  analyzeCard(input: ContentAiAnalyzeInput): Promise<Record<string, unknown>>;
}
