import type { PostRevision } from "@/lib/media-preview";
import { ActivityTimeline, type TimelineEvent } from "@/components/lotus/ActivityTimeline";

const REVISION_LABEL: Record<string, string> = {
  aprovacao: "Aprovado",
  solicitacao_alteracao: "Alteração solicitada",
  reprovacao: "Reprovado",
  mudanca_status: "Status alterado",
  comentario: "Comentado",
};

const STATUS_EVENT: Record<string, string> = {
  rascunho: "Criada",
  em_producao: "Alterada",
  aguardando_aprovacao: "Enviada para aprovação",
  aprovado: "Aprovada",
  publicado: "Publicada",
};

function revisionToEvent(r: PostRevision): TimelineEvent {
  const actionLabel =
    r.tipo === "mudanca_status" && r.status_para
      ? (STATUS_EVENT[r.status_para] ?? REVISION_LABEL[r.tipo])
      : (REVISION_LABEL[r.tipo] ?? r.tipo);

  const tone: TimelineEvent["tone"] =
    r.tipo === "aprovacao"
      ? "success"
      : r.tipo === "reprovacao"
        ? "danger"
        : r.tipo === "solicitacao_alteracao"
          ? "warning"
          : r.tipo === "comentario"
            ? "primary"
            : "muted";

  return {
    id: r.id,
    created_at: r.created_at,
    autor_email: r.autor_email,
    label: actionLabel,
    subtitle:
      r.status_de && r.status_para && r.tipo === "mudanca_status"
        ? `${r.status_de} → ${r.status_para}`
        : undefined,
    mensagem: r.mensagem,
    tone,
    messageTone:
      r.tipo === "solicitacao_alteracao" || r.tipo === "reprovacao" ? "warning" : "default",
  };
}

export function ApprovalTimeline({ revisions }: { revisions: PostRevision[] }) {
  if (revisions.length === 0) return null;

  return (
    <div className="border-t border-border/60 bg-muted/10 px-4 py-4 sm:px-5">
      <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Timeline
      </p>
      <ActivityTimeline events={revisions.map(revisionToEvent)} />
    </div>
  );
}
