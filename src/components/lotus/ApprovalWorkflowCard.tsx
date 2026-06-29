import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  RotateCcw,
  ZoomIn,
  XCircle,
} from "lucide-react";
import { getPost } from "@/lib/editorial.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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
  created_at?: string;
};

type Revision = {
  id: string;
  autor_email: string | null;
  tipo: string;
  mensagem: string | null;
  status_de: string | null;
  status_para: string | null;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  aguardando_aprovacao: "bg-warning/12 text-warning",
  aprovado: "bg-success/12 text-[color:var(--success)]",
  em_producao: "bg-primary/10 text-primary-700 dark:text-primary-200",
  publicado: "bg-secondary/80 text-secondary-foreground",
  rascunho: "bg-muted text-muted-foreground",
};

const REVISION_LABEL: Record<string, string> = {
  aprovacao: "Aprovado",
  solicitacao_alteracao: "Alteração solicitada",
  mudanca_status: "Status alterado",
  comentario: "Comentário",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPubDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ApprovalWorkflowCard({
  post,
  onApprove,
  onRequestChange,
  onComment,
  isPending,
}: {
  post: ApprovalPost;
  onApprove: (id: string) => void;
  onRequestChange: (id: string, msg: string) => void;
  onComment: (id: string, msg: string) => void;
  isPending?: boolean;
}) {
  const [msg, setMsg] = useState("");
  const [comment, setComment] = useState("");
  const getPostFn = useServerFn(getPost);

  const { data: detail } = useQuery({
    queryKey: ["approval-post", post.id],
    queryFn: () => getPostFn({ data: { id: post.id } }),
    staleTime: 30_000,
  });

  const revisions = (detail?.revisions ?? []) as Revision[];

  return (
    <article className="lotus-surface overflow-hidden">
      <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
        {/* Preview */}
        <div className="relative border-b border-border/60 bg-muted/20 lg:border-b-0 lg:border-r">
          {post.capa_url ? (
            <>
              <img
                src={post.capa_url}
                alt=""
                className="aspect-[4/5] max-h-[420px] w-full object-cover lg:max-h-none lg:min-h-[320px]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.classList.add("hidden");
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
              <div className="hidden flex aspect-[4/5] min-h-[240px] items-center justify-center text-xs text-muted-foreground">
                Imagem indisponível
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-3 right-3 h-8 gap-1.5 shadow-md"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                    Ampliar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] max-w-4xl overflow-auto p-2 sm:p-4">
                  <DialogHeader className="sr-only">
                    <DialogTitle>Preview — {post.titulo}</DialogTitle>
                  </DialogHeader>
                  <img
                    src={post.capa_url}
                    alt={post.titulo}
                    className="mx-auto max-h-[80vh] w-auto max-w-full rounded-lg object-contain"
                    referrerPolicy="no-referrer"
                  />
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <div className="flex min-h-[240px] items-center justify-center text-[11px] text-muted-foreground">
              Sem capa
            </div>
          )}
        </div>

        {/* Conteúdo + ações */}
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
              {post.cliente_nome} · {post.plataforma}
              {post.formato ? ` · ${post.formato}` : ""}
            </p>
            <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Publicação prevista: {formatPubDate(post.data_publicacao)}
              {post.created_at && (
                <> · Enviado em {formatDate(post.created_at)}</>
              )}
            </p>
          </header>

          {post.legenda && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border/60 bg-background/40 p-3">
              <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground">
                {post.legenda}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button disabled={isPending} onClick={() => onApprove(post.id)}>
              <CheckCircle2 className="h-4 w-4" />
              Aprovar
            </Button>
          </div>

          <div className="space-y-1.5">
            <Textarea
              rows={2}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Motivo da recusa ou alteração necessária…"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!msg.trim() || isPending}
              onClick={() => {
                onRequestChange(post.id, msg);
                setMsg("");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Solicitar alteração
            </Button>
          </div>

          <div className="flex gap-2 border-t border-border/60 pt-3">
            <Textarea
              rows={1}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comentar sem alterar status…"
              className="min-h-9"
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={!comment.trim() || isPending}
              onClick={() => {
                onComment(post.id, comment);
                setComment("");
              }}
            >
              Enviar
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {revisions.length > 0 && (
        <div className="border-t border-border/60 bg-muted/10 px-4 py-4 sm:px-5">
          <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Histórico de aprovação
          </p>
          <ol className="relative space-y-0 border-l border-border/70 pl-4">
            {revisions.map((r) => (
              <li key={r.id} className="relative pb-4 last:pb-0">
                <span
                  className={cn(
                    "absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ring-2 ring-background",
                    r.tipo === "aprovacao" && "bg-[color:var(--success)]",
                    r.tipo === "solicitacao_alteracao" && "bg-warning",
                    r.tipo === "comentario" && "bg-primary",
                    r.tipo === "mudanca_status" && "bg-muted-foreground",
                  )}
                />
                <div className="ml-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[12px] font-medium text-foreground">
                      {REVISION_LABEL[r.tipo] ?? r.tipo}
                    </span>
                    {r.status_de && r.status_para && (
                      <span className="text-[10px] text-muted-foreground">
                        {r.status_de} → {r.status_para}
                      </span>
                    )}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground">
                    {r.autor_email ?? "Sistema"} · {formatDate(r.created_at)}
                  </p>
                  {r.mensagem && (
                    <p className="mt-1 flex items-start gap-1.5 rounded-md bg-background/60 p-2 text-[11.5px] text-foreground">
                      {r.tipo === "solicitacao_alteracao" ? (
                        <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                      ) : (
                        <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                      )}
                      {r.mensagem}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
