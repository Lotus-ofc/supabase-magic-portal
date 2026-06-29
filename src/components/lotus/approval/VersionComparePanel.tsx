import { useMemo } from "react";
import { ArrowDown } from "lucide-react";
import { MediaPreview } from "@/components/lotus/MediaPreview";
import { buildPreviewContext, capaUrlToAsset, type MediaAsset } from "@/lib/media-preview";

type SnapshotPayload = {
  post?: Record<string, unknown>;
  media?: Array<{
    storage_path?: string;
    mime_type?: string;
    kind?: string;
    id?: string;
  }>;
};

function snapshotToAssets(snapshot: SnapshotPayload, currentMedia: MediaAsset[]): MediaAsset[] {
  const snapMedia = snapshot.media ?? [];
  if (snapMedia.length === 0) {
    const capa = snapshot.post?.capa_url as string | null | undefined;
    return capaUrlToAsset(capa ?? null);
  }
  return snapMedia.map((m, i) => ({
    id: m.id ?? `snap-${i}`,
    kind: (m.kind as "image" | "video") ?? "image",
    url: currentMedia[i]?.url ?? "",
  }));
}

export function VersionComparePanel({
  snapshots,
  currentPost,
  currentMedia,
}: {
  snapshots: Array<{ id: string; snapshot: SnapshotPayload; created_at: string }>;
  currentPost: {
    formato: string | null;
    plataforma: string;
    legenda: string | null;
    cliente_nome: string;
    data_publicacao: string;
    localizacao?: string | null;
  };
  currentMedia: MediaAsset[];
}) {
  const previous = snapshots[0];
  const showCompare = useMemo(() => {
    if (!previous) return false;
    const prevLegenda = (previous.snapshot.post?.legenda as string) ?? "";
    return prevLegenda !== (currentPost.legenda ?? "") || snapshots.length > 0;
  }, [previous, currentPost.legenda, snapshots.length]);

  if (!previous || !showCompare) return null;

  const prevPost = {
    ...currentPost,
    legenda: (previous.snapshot.post?.legenda as string) ?? null,
    formato: (previous.snapshot.post?.formato as string) ?? currentPost.formato,
  };
  const prevAssets = snapshotToAssets(previous.snapshot, currentMedia);
  const hasPrevVisual = prevAssets.some((a) => a.url);

  return (
    <div className="border-t border-border/60 bg-muted/5 px-4 py-4 sm:px-5">
      <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Comparação de versões
      </p>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-muted-foreground">Versão anterior</p>
          {hasPrevVisual ? (
            <MediaPreview
              context={buildPreviewContext(prevPost, prevAssets, { showEngagement: false })}
              interactive={false}
              compact
            />
          ) : (
            <p className="rounded-lg border border-dashed border-border/60 p-4 text-[12px] text-muted-foreground">
              Snapshot sem mídia visual
            </p>
          )}
          {prevPost.legenda && (
            <p className="rounded-md bg-background/50 p-2 text-[11.5px] text-foreground">
              {prevPost.legenda}
            </p>
          )}
        </div>

        <div className="hidden items-center justify-center lg:flex">
          <ArrowDown className="h-5 w-5 rotate-[-90deg] text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-foreground">Versão atual</p>
          <MediaPreview
            context={buildPreviewContext(currentPost, currentMedia, { showEngagement: false })}
            interactive={false}
            compact
          />
          {currentPost.legenda && (
            <p className="rounded-md bg-background/50 p-2 text-[11.5px] text-foreground">
              {currentPost.legenda}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
