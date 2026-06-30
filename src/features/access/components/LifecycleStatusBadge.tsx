import type { AccessLifecycleStatus } from "../types";

const LABELS: Record<AccessLifecycleStatus, string> = {
  invite_pending: "Convite pendente",
  awaiting_password: "Aguardando senha",
  active: "Ativo",
  revoked: "Revogado",
  disabled: "Desativado",
};

const STYLES: Record<AccessLifecycleStatus, string> = {
  invite_pending: "bg-amber-500/12 text-amber-800 dark:text-amber-200 border-amber-500/20",
  awaiting_password: "bg-sky-500/12 text-sky-800 dark:text-sky-200 border-sky-500/20",
  active: "bg-success/12 text-[color:var(--success)] border-success/20",
  revoked: "bg-destructive/12 text-destructive border-destructive/20",
  disabled: "bg-muted text-muted-foreground border-border",
};

export function lifecycleStatusLabel(status: AccessLifecycleStatus): string {
  return LABELS[status] ?? status;
}

export function LifecycleStatusBadge({ status }: { status: AccessLifecycleStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STYLES[status] ?? STYLES.disabled}`}
    >
      {lifecycleStatusLabel(status)}
    </span>
  );
}
