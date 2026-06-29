import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { transitionPost, addPostComment } from "@/lib/editorial.functions";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { EmptyState } from "@/components/lotus/EmptyState";
import { ApprovalWorkflowCard, type ApprovalPost } from "@/components/lotus/ApprovalWorkflowCard";
import { pushNotification } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit-log";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { brandTitle } from "@/lib/brand";
import { CheckCircle2 } from "lucide-react";

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
  const [actingId, setActingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["aprovacoes", "pendentes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts_editorial")
        .select("*")
        .eq("status", "aguardando_aprovacao")
        .order("data_publicacao", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ApprovalPost[];
    },
  });

  const posts = data ?? [];

  const runAction = async (id: string, fn: () => Promise<void>) => {
    setActingId(id);
    try {
      await fn();
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Conteúdo"
        title="Aprovações pendentes"
        description="Visualize o conteúdo exatamente como será publicado antes de aprovar."
      />

      {isLoading ? (
        <DashboardSkeleton kpiCount={0} withChart={false} />
      ) : posts.length === 0 ? (
        <SectionCard eyebrow="Tudo certo" title="Sem pendências">
          <EmptyState
            icon={CheckCircle2}
            title="Nenhum post aguardando aprovação"
            description="Quando houver conteúdo para aprovar, ele aparece aqui com preview fiel, timeline e ações."
          />
        </SectionCard>
      ) : (
        <div className="space-y-5">
          {posts.map((p) => (
            <ApprovalWorkflowCard
              key={p.id}
              post={p}
              isPending={actingId === p.id}
              onApprove={(id, mensagem) =>
                runAction(id, () =>
                  transitionFn({
                    data: {
                      id,
                      action: "aprovar",
                      mensagem: mensagem ?? null,
                    },
                  }).then(() => {
                    toast.success("Post aprovado.");
                    pushNotification({
                      kind: "aprovacao",
                      title: `“${p.titulo}” aprovado`,
                      body: `${p.cliente_nome} · ${p.plataforma}`,
                      href: "/aprovacoes",
                    });
                    recordAudit({
                      action: "aprovacao",
                      detail: `Post aprovado: ${p.titulo}`,
                    });
                    qc.invalidateQueries({ queryKey: ["aprovacoes"] });
                    qc.invalidateQueries({ queryKey: ["approval-post", id] });
                  }),
                ).catch((e: Error) => toast.error(e.message))
              }
              onRequestChange={(id, mensagem) =>
                runAction(id, () =>
                  transitionFn({
                    data: { id, action: "solicitar_alteracao", mensagem },
                  }).then(() => {
                    toast.success("Alteração solicitada.");
                    pushNotification({
                      kind: "reprovacao",
                      title: `Alteração solicitada em “${p.titulo}”`,
                      body: mensagem.slice(0, 120),
                      href: "/admin/editorial",
                    });
                    recordAudit({
                      action: "reprovacao",
                      detail: `Alteração solicitada: ${p.titulo}`,
                    });
                    qc.invalidateQueries({ queryKey: ["aprovacoes"] });
                    qc.invalidateQueries({ queryKey: ["approval-post", id] });
                  }),
                ).catch((e: Error) => toast.error(e.message))
              }
              onReject={(id, mensagem) =>
                runAction(id, () =>
                  transitionFn({
                    data: { id, action: "reprovar", mensagem },
                  }).then(() => {
                    toast.success("Publicação reprovada.");
                    pushNotification({
                      kind: "reprovacao",
                      title: `“${p.titulo}” reprovado`,
                      body: mensagem.slice(0, 120),
                      href: "/admin/editorial",
                    });
                    recordAudit({
                      action: "reprovacao",
                      detail: `Post reprovado: ${p.titulo}`,
                    });
                    qc.invalidateQueries({ queryKey: ["aprovacoes"] });
                    qc.invalidateQueries({ queryKey: ["approval-post", id] });
                  }),
                ).catch((e: Error) => toast.error(e.message))
              }
              onComment={(id, mensagem) =>
                runAction(id, () =>
                  commentFn({ data: { id, mensagem } }).then(() => {
                    qc.invalidateQueries({ queryKey: ["approval-post", id] });
                  }),
                ).catch((e: Error) => toast.error(e.message))
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
