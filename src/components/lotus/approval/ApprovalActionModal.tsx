import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ApprovalAction } from "@/lib/media-preview";
import { CheckCircle2, MessageSquareWarning, XCircle } from "lucide-react";
import { useState, useEffect } from "react";

const ACTION_META: Record<
  ApprovalAction,
  {
    title: string;
    description: string;
    confirm: string;
    icon: typeof CheckCircle2;
    variant: "default" | "outline" | "destructive";
    requireMessage?: boolean;
    placeholder: string;
  }
> = {
  aprovar: {
    title: "Aprovar publicação",
    description: "Confirme que o preview representa exatamente o conteúdo que será publicado.",
    confirm: "Confirmar aprovação",
    icon: CheckCircle2,
    variant: "default",
    placeholder: "Comentário opcional…",
  },
  solicitar_alteracao: {
    title: "Solicitar ajustes",
    description: "Descreva o que precisa ser alterado antes da publicação.",
    confirm: "Enviar solicitação",
    icon: MessageSquareWarning,
    variant: "outline",
    requireMessage: true,
    placeholder: "Detalhe os ajustes necessários…",
  },
  reprovar: {
    title: "Reprovar publicação",
    description: "O conteúdo voltará para produção. Informe o motivo da reprovação.",
    confirm: "Confirmar reprovação",
    icon: XCircle,
    variant: "destructive",
    requireMessage: true,
    placeholder: "Motivo da reprovação…",
  },
};

export function ApprovalActionModal({
  action,
  open,
  onOpenChange,
  onConfirm,
  isPending,
  postTitle,
}: {
  action: ApprovalAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (message: string) => void;
  isPending?: boolean;
  postTitle: string;
}) {
  const [message, setMessage] = useState("");
  const meta = action ? ACTION_META[action] : null;
  const Icon = meta?.icon ?? CheckCircle2;

  useEffect(() => {
    if (!open) setMessage("");
  }, [open]);

  if (!meta) return null;

  const canSubmit = meta.requireMessage ? message.trim().length > 0 : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lotus-surface max-w-md border-border">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Icon
              className={cn(
                "h-5 w-5",
                action === "reprovar" && "text-destructive",
                action === "aprovar" && "text-[color:var(--success)]",
                action === "solicitar_alteracao" && "text-warning",
              )}
            />
          </div>
          <DialogTitle className="font-display text-[17px]">{meta.title}</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            {meta.description}
          </DialogDescription>
          <p className="text-[11px] text-muted-foreground">“{postTitle}”</p>
        </DialogHeader>

        <Textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={meta.placeholder}
          className="text-[13px]"
        />

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant={meta.variant}
            disabled={!canSubmit || isPending}
            onClick={() => onConfirm(message.trim())}
          >
            {meta.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
