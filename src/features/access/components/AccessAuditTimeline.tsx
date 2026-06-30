import type { AccessAuditRow } from "../types";

const ACTION_LABELS: Record<string, string> = {
  invite_sent: "Convite enviado",
  invite_resent: "Convite reenviado",
  invite_cancelled: "Convite cancelado",
  invite_accepted: "Convite aceito",
  first_access_completed: "Primeiro acesso concluído",
  password_changed: "Senha alterada",
  password_reset_requested: "Redefinição solicitada",
  password_reset_completed: "Redefinição concluída",
  access_revoked: "Acesso revogado",
  access_reactivated: "Acesso reativado",
  access_disabled: "Acesso desativado",
  user_deleted: "Usuário excluído",
  sessions_revoked: "Sessões invalidadas",
  lifecycle_reconciled: "Lifecycle recalculado",
  metadata_revalidated: "Metadata revalidada",
  onboarding_restarted: "Onboarding reiniciado",
  auth_error: "Erro de autenticação",
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return iso;
  }
}

export function AccessAuditTimeline({ rows }: { rows: AccessAuditRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum evento registrado na auditoria.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l border-border pl-4">
      {rows.map((row) => (
        <li key={row.id} className="relative">
          <span className="absolute -left-[calc(0.5rem+5px)] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
          <div className="space-y-0.5">
            <p className="text-[13px] font-medium text-foreground">
              {ACTION_LABELS[row.action] ?? row.action}
            </p>
            {row.detail ? <p className="text-[12px] text-muted-foreground">{row.detail}</p> : null}
            <p className="text-[10.5px] text-muted-foreground/80">{fmt(row.created_at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
