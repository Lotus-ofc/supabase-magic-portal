import { brandTitle } from "@/lib/brand";
// Lista posts em status `aguardando_aprovacao` dos clientes que o usuário tem
// acesso (RLS já filtra pelo client_access). Permite aprovar ou solicitar
// alteração. Reutiliza transitionPost.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { transitionPost, addPostComment } from "@/lib/editorial.functions";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, RotateCcw, Inbox } from "lucide-react";

type Post = {
  id: string;
  cliente_nome: string;
  data_publicacao: string;
  titulo: string;
  legenda: string | null;
  plataforma: string;
  formato: string | null;
  capa_url: string | null;
  status: string;
};

export const Route = createFileRoute("/_authenticated/aprovacoes")({
  head: () => ({ meta: [{ title: brandTitle("Aprovações") }] }),
  component: AprovacoesPage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
  notFoundComponent: () => <div>Não encontrado</div>,
});

function AprovacoesPage() {
  const qc = useQueryClient();
  const transitionFn = useServerFn(transitionPost);
  const commentFn = useServerFn(addPostComment);

  const { data, isLoading } = useQuery({
    queryKey: ["aprovacoes", "pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts_editorial")
        .select("*")
        .eq("status", "aguardando_aprovacao")
        .order("data_publicacao", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Post[];
    },
  });

  const posts = data ?? [];

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Conteúdo"
        title="Aprovações pendentes"
        description="Revise e aprove os conteúdos antes da publicação."
      />

      {isLoading ? (
        <div className="lotus-surface h-40">
          <div className="lotus-skeleton m-5 h-3 w-40" />
        </div>
      ) : posts.length === 0 ? (
        <SectionCard
          eyebrow="Tudo certo"
          title="Sem pendências"
          description="Nenhum post aguardando aprovação no momento."
        >
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-[color:var(--success)]">
              <Inbox className="h-4 w-4" />
            </div>
            <p className="text-[12.5px] text-muted-foreground">
              Quando houver conteúdo para aprovar, ele aparece aqui.
            </p>
          </div>
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {posts.map((p) => (
            <ApprovalCard
              key={p.id}
              post={p}
              onApprove={(id) =>
                transitionFn({ data: { id, action: "aprovar" } })
                  .then(() => {
                    toast.success("Post aprovado.");
                    qc.invalidateQueries({ queryKey: ["aprovacoes"] });
                  })
                  .catch((e: any) => toast.error(e.message))
              }
              onRequestChange={(id, mensagem) =>
                transitionFn({
                  data: { id, action: "solicitar_alteracao", mensagem },
                })
                  .then(() => {
                    toast.success("Alteração solicitada.");
                    qc.invalidateQueries({ queryKey: ["aprovacoes"] });
                  })
                  .catch((e: any) => toast.error(e.message))
              }
              onComment={(id, mensagem) =>
                commentFn({ data: { id, mensagem } })
                  .then(() => toast.success("Comentário enviado."))
                  .catch((e: any) => toast.error(e.message))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  post,
  onApprove,
  onRequestChange,
  onComment,
}: {
  post: Post;
  onApprove: (id: string) => void;
  onRequestChange: (id: string, msg: string) => void;
  onComment: (id: string, msg: string) => void;
}) {
  const [msg, setMsg] = useState("");
  const [comment, setComment] = useState("");
  const requestMut = useMutation({
    mutationFn: async () => onRequestChange(post.id, msg),
    onSuccess: () => setMsg(""),
  });
  const commentMut = useMutation({
    mutationFn: async () => onComment(post.id, comment),
    onSuccess: () => setComment(""),
  });

  return (
    <div className="lotus-surface overflow-hidden">
      {post.capa_url ? (
        <img
          src={post.capa_url}
          alt=""
          className="h-56 w-full border-b border-border/60 object-cover"
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ) : (
        <div className="flex h-32 items-center justify-center border-b border-border/60 bg-muted/30 text-[11px] text-muted-foreground">
          Sem capa
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-warning">
              Aguardando aprovação
            </p>
            <h3 className="mt-0.5 font-display text-[15px] font-semibold text-foreground">
              {post.titulo}
            </h3>
            <p className="mt-0.5 text-[11.5px] text-muted-foreground">
              {post.cliente_nome} · {post.plataforma}
              {post.formato ? ` · ${post.formato}` : ""} ·{" "}
              {new Date(post.data_publicacao + "T00:00:00").toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {post.legenda && (
          <div className="rounded-lg border border-border/60 bg-background/40 p-3">
            <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-foreground">
              {post.legenda}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => onApprove(post.id)}>
            <CheckCircle2 /> Aprovar
          </Button>
        </div>

        <div className="grid gap-1.5">
          <Textarea
            rows={2}
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Descreva a alteração que precisa…"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!msg.trim() || requestMut.isPending}
            onClick={() => requestMut.mutate()}
          >
            <RotateCcw /> Solicitar alteração
          </Button>
        </div>

        <div className="border-t border-border/60 pt-3">
          <div className="flex gap-2">
            <Textarea
              rows={1}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Comentar sem alterar status…"
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={!comment.trim() || commentMut.isPending}
              onClick={() => commentMut.mutate()}
            >
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
