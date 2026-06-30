import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AccessRecoveryAction } from "@/lib/access.functions.server";

const RECOVERY_ACTIONS: {
  action: AccessRecoveryAction;
  label: string;
  description: string;
  variant?: "destructive" | "outline" | "default";
}[] = [
  {
    action: "auto_fix",
    label: "Corrigir inconsistências",
    description: "Recalcula lifecycle e alinha metadata automaticamente.",
  },
  {
    action: "recalculate_lifecycle",
    label: "Recalcular lifecycle",
    description: "Compara Auth + metadata + lifecycle e sugere correção.",
  },
  {
    action: "revalidate_metadata",
    label: "Revalidar metadata",
    description: "Atualiza flags lots_bi para usuários legados com login.",
  },
  {
    action: "resend_invite",
    label: "Reenviar convite",
    description: "Novo e-mail via Supabase Auth (redirect /auth/callback).",
  },
  {
    action: "restart_onboarding",
    label: "Reiniciar onboarding",
    description: "Invalida sessões, limpa onboarding e reenvia convite.",
  },
  {
    action: "invalidate_sessions",
    label: "Invalidar sessões",
    description: "Encerra todas as sessões ativas do usuário.",
  },
  {
    action: "force_password_reset",
    label: "Forçar redefinição de senha",
    description: "Envia link de recovery e invalida sessões.",
  },
  {
    action: "reactivate",
    label: "Reativar usuário",
    description: "Remove ban e restaura lifecycle conforme metadata.",
  },
  {
    action: "revoke",
    label: "Revogar usuário",
    description: "Ban no Supabase + lifecycle revoked.",
    variant: "destructive",
  },
  {
    action: "disable",
    label: "Desativar usuário",
    description: "Soft ban de negócio (lifecycle disabled).",
    variant: "destructive",
  },
];

export function RecoveryModePanel({
  onAction,
  busy,
}: {
  onAction: (action: AccessRecoveryAction) => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="lotus-surface space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Recovery Mode</h3>
          <p className="text-xs text-muted-foreground">
            Ações operacionais via APIs oficiais do Supabase — sem Dashboard.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Ocultar" : "Expandir"}
        </Button>
      </div>

      {expanded && (
        <div className="grid gap-2 sm:grid-cols-2">
          {RECOVERY_ACTIONS.map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={busy}
              onClick={() => onAction(item.action)}
              className="rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-muted/40 disabled:opacity-50"
            >
              <p className="text-[13px] font-medium text-foreground">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{item.description}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
