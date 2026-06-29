import { MessageSquare, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PostRevision } from "@/lib/media-preview";

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ApprovalTimeline({ revisions }: { revisions: PostRevision[] }) {
  if (revisions.length === 0) return null;

  const sorted = [...revisions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div className="border-t border-border/60 bg-muted/10 px-4 py-4 sm:px-5">
      <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Timeline
      </p>
      <ol className="relative space-y-0 border-l border-border/70 pl-4">
        {sorted.map((r) => {
          const actionLabel =
            r.tipo === "mudanca_status" && r.status_para
              ? (STATUS_EVENT[r.status_para] ?? REVISION_LABEL[r.tipo])
              : (REVISION_LABEL[r.tipo] ?? r.tipo);

          return (
            <li key={r.id} className="relative pb-4 last:pb-0">
              <span
                className={cn(
                  "absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ring-2 ring-background",
                  r.tipo === "aprovacao" && "bg-[color:var(--success)]",
                  r.tipo === "reprovacao" && "bg-destructive",
                  r.tipo === "solicitacao_alteracao" && "bg-warning",
                  r.tipo === "comentario" && "bg-primary",
                  r.tipo === "mudanca_status" && "bg-muted-foreground",
                )}
              />
              <div className="ml-2 animate-in fade-in slide-in-from-left-1 duration-300">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] font-medium text-foreground">{actionLabel}</span>
                  {r.status_de && r.status_para && r.tipo === "mudanca_status" && (
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
                    {r.tipo === "solicitacao_alteracao" || r.tipo === "reprovacao" ? (
                      <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                    ) : (
                      <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    {r.mensagem}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
