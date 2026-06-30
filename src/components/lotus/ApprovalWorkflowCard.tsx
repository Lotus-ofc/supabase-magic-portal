import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, MessageSquareWarning, RotateCcw, XCircle } from "lucide-react";
import { getPost } from "@/lib/editorial.functions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MediaPreview } from "@/components/lotus/MediaPreview";
import {
  buildPreviewContext,
  capaUrlToAsset,
  type ApprovalAction,
  type MediaAsset,
  type PostRevision,
} from "@/lib/media-preview";
import { ApprovalActionModal } from "@/components/lotus/approval/ApprovalActionModal";
import { ApprovalTimeline } from "@/components/lotus/approval/ApprovalTimeline";
import { PublicationMetaPanel } from "@/components/lotus/approval/PublicationMetaPanel";
import { VersionComparePanel } from "@/components/lotus/approval/VersionComparePanel";

export type ApprovalPost = {
  id: string;
  cliente_nome: string;
  data_publicacao: string;
  titulo: string;
  legenda: string | null;
  plataforma: string;
  formato: string | null;
  capa_url: string | null;
  status: string;
  localizacao?: string | null;
  tags?: string[] | null;
  observacoes?: string | null;
  responsavel_email?: string | null;
  created_at?: string;
  created_by?: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  aguardando_aprovacao: "bg-warning/12 text-warning",
  aprovado: "bg-success/12 text-[color:var(--success)]",
  em_producao: "bg-primary/10 text-primary-700 dark:text-primary-200",
  publicado: "bg-secondary/80 text-secondary-foreground",
  rascunho: "bg-muted text-muted-foreground",
};

export function ApprovalWorkflowCard({
  post,
  onApprove,
  onRequestChange,
  onReject,
  onComment,
  isPending,
}: {
  post: ApprovalPost;
  onApprove: (id: string, msg?: string) => void;
  onRequestChange: (id: string, msg: string) => void;
  onReject: (id: string, msg: string) => void;
  onComment?: (id: string, msg: string) => void;
  isPending?: boolean;
}) {
  const [modalAction, setModalAction] = useState<ApprovalAction | null>(null);
  const getPostFn = useServerFn(getPost);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["approval-post", post.id],
    queryFn: () => getPostFn({ data: { id: post.id } }),
    staleTime: 30_000,
  });

  const media: MediaAsset[] = useMemo(() => {
    if (detail?.media?.length) return detail.media as MediaAsset[];
    return capaUrlToAsset(post.capa_url);
  }, [detail?.media, post.capa_url]);

  const revisions = (detail?.revisions ?? []) as PostRevision[];
  const snapshots = (detail?.snapshots ?? []) as Array<{
    id: string;
    snapshot: Record<string, unknown>;
    created_at: string;
  }>;

  const previewContext = buildPreviewContext(post, media);

  const handleModalConfirm = (message: string) => {
    if (!modalAction) return;
    if (modalAction === "aprovar") {
      onApprove(post.id, message || undefined);
      if (message && onComment) onComment(post.id, message);
    } else if (modalAction === "solicitar_alteracao") {
      onRequestChange(post.id, message);
    } else if (modalAction === "reprovar") {
      onReject(post.id, message);
    }
    setModalAction(null);
  };

  return (
    <article className="lotus-surface overflow-hidden transition-shadow duration-300 hover:shadow-md">
      <div className="grid grid-cols-1 gap-0 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* Preview fiel — mídia oficial, nunca URL */}
        <div className="border-b border-border/60 bg-muted/15 p-4 xl:border-b-0 xl:border-r xl:p-5">
          <MediaPreview context={previewContext} loading={detailLoading} />
        </div>

        {/* Ações profissionais */}
        <div className="flex flex-col gap-4 p-4 sm:p-5">
          <header className="space-y-2">
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                STATUS_STYLE[post.status] ?? STATUS_STYLE.aguardando_aprovacao,
              )}
            >
              Aguardando aprovação
            </span>
            <h3 className="font-display text-lg font-semibold leading-snug text-foreground">
              {post.titulo}
            </h3>
            <p className="text-[12px] text-muted-foreground">
              Revise o preview acima — é exatamente o que será publicado.
            </p>
          </header>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              className="min-h-[44px] w-full sm:w-auto"
              disabled={isPending}
              onClick={() => setModalAction("aprovar")}
            >
              <CheckCircle2 className="h-4 w-4" />
              Aprovar
            </Button>
            <Button
              variant="outline"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={isPending}
              onClick={() => setModalAction("solicitar_alteracao")}
            >
              <RotateCcw className="h-4 w-4" />
              Solicitar ajustes
            </Button>
            <Button
              variant="destructive"
              className="min-h-[44px] w-full sm:w-auto"
              disabled={isPending}
              onClick={() => setModalAction("reprovar")}
            >
              <XCircle className="h-4 w-4" />
              Reprovar
            </Button>
          </div>

          <p className="hidden items-center gap-1.5 text-[10.5px] text-muted-foreground sm:flex">
            <MessageSquareWarning className="h-3 w-3" />
            Atalhos: F tela cheia · +/- zoom · ← → carrossel
          </p>
        </div>
      </div>

      <PublicationMetaPanel post={post} media={media} />

      <VersionComparePanel snapshots={snapshots as any} currentPost={post} currentMedia={media} />

      <ApprovalTimeline revisions={revisions} />

      <ApprovalActionModal
        action={modalAction}
        open={modalAction !== null}
        onOpenChange={(o) => !o && setModalAction(null)}
        onConfirm={handleModalConfirm}
        isPending={isPending}
        postTitle={post.titulo}
      />
    </article>
  );
}
