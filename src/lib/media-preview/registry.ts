import type { MediaFormatDef, MediaFormatKey, MediaPreviewContext } from "./types";

export const MEDIA_FORMAT_REGISTRY: MediaFormatDef[] = [
  {
    key: "story",
    label: "Story",
    priority: 100,
    matches: (ctx) => normalizeFormato(ctx.formato) === "story",
  },
  {
    key: "reel",
    label: "Reel",
    priority: 90,
    matches: (ctx) =>
      normalizeFormato(ctx.formato) === "reel" ||
      (ctx.assets.length === 1 &&
        ctx.assets[0].kind === "video" &&
        normalizeFormato(ctx.formato) === "reel"),
  },
  {
    key: "carousel",
    label: "Carrossel",
    priority: 80,
    matches: (ctx) => ctx.assets.length > 1 || normalizeFormato(ctx.formato) === "carrossel",
  },
  {
    key: "video",
    label: "Vídeo",
    priority: 70,
    matches: (ctx) =>
      ctx.assets.length === 1 &&
      ctx.assets[0].kind === "video" &&
      normalizeFormato(ctx.formato) !== "reel",
  },
  {
    key: "feed",
    label: "Feed",
    priority: 10,
    matches: () => true,
  },
];

export function normalizeFormato(formato: string | null | undefined): string {
  return (formato ?? "").trim().toLowerCase();
}

/** Resolve o renderer declarativo a partir do contexto. */
export function resolveMediaFormat(ctx: MediaPreviewContext): MediaFormatKey {
  const sorted = [...MEDIA_FORMAT_REGISTRY].sort((a, b) => b.priority - a.priority);
  const match = sorted.find((def) => def.matches(ctx));
  return match?.key ?? "feed";
}

export function getFormatLabel(key: MediaFormatKey): string {
  return MEDIA_FORMAT_REGISTRY.find((d) => d.key === key)?.label ?? key;
}
