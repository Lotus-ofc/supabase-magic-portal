// ============================================================================
// Lotus · Media Preview — contrato declarativo.
// Novo formato = registrar MediaFormatDef + Renderer. Nenhum switch espalhado.
// ============================================================================

export type MediaKind = "image" | "video";

export type MediaFormatKey = "feed" | "carousel" | "story" | "reel" | "video";

/** Asset de mídia resolvido (URL pronta para render — nunca exibir como texto). */
export interface MediaAsset {
  id: string;
  kind: MediaKind;
  url: string;
  posterUrl?: string | null;
  mimeType?: string;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  ordem?: number;
}

/** Contexto completo para renderizar preview fiel à publicação. */
export interface MediaPreviewContext {
  /** feed | story | reel | carrossel | video — normalizado internamente */
  formato: string | null;
  plataforma: string;
  assets: MediaAsset[];
  caption: string | null;
  accountName: string;
  accountAvatarUrl?: string | null;
  location?: string | null;
  scheduledAt?: string | null;
  /** Curtidas fictícias no mock social (opcional) */
  showEngagement?: boolean;
}

export interface MediaFormatDef {
  key: MediaFormatKey;
  label: string;
  /** Maior = avaliado primeiro */
  priority: number;
  matches: (ctx: MediaPreviewContext) => boolean;
}

export interface ParsedCaption {
  text: string;
  hashtags: string[];
}

export interface EditorialPostMediaRow {
  id: string;
  post_id: string;
  storage_path: string;
  mime_type: string;
  kind: MediaKind;
  ordem: number;
  width: number | null;
  height: number | null;
  duration_seconds: number | null;
  poster_path: string | null;
  created_at: string;
}

export interface EditorialPostSnapshot {
  id: string;
  post_id: string;
  snapshot: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}

export interface EditorialPostDetail {
  id: string;
  cadastro_cliente_id: number;
  cliente_nome: string;
  data_publicacao: string;
  titulo: string;
  legenda: string | null;
  plataforma: string;
  formato: string | null;
  capa_url: string | null;
  status: string;
  localizacao: string | null;
  tags: string[] | null;
  observacoes: string | null;
  responsavel_email: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  media: MediaAsset[];
  snapshots: EditorialPostSnapshot[];
}

export type ApprovalAction = "aprovar" | "solicitar_alteracao" | "reprovar";

export type RevisionTipo =
  | "comentario"
  | "solicitacao_alteracao"
  | "aprovacao"
  | "mudanca_status"
  | "reprovacao";

export interface PostRevision {
  id: string;
  post_id: string;
  autor_id: string | null;
  autor_email: string | null;
  tipo: RevisionTipo | string;
  mensagem: string | null;
  status_de: string | null;
  status_para: string | null;
  created_at: string;
}
