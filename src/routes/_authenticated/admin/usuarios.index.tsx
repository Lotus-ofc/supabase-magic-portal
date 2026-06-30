import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listUsersWithRoles, resendUserInvite } from "@/lib/admin.functions";
import { adminTitle } from "@/lib/brand";
import { PageHeader } from "@/components/lotus/PageHeader";
import { StatCard } from "@/components/lotus/StatCard";
import { TextInput } from "@/components/lotus/FormField";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/lotus/ConfirmDialog";
import { toast } from "sonner";
import {
  Search,
  ShieldCheck,
  User,
  UserPlus,
  Users as UsersIcon,
  CheckCircle2,
  Clock3,
  Send,
} from "lucide-react";

const usersQuery = {
  queryKey: ["admin", "users-with-roles"],
  queryFn: () => listUsersWithRoles(),
};

export const Route = createFileRoute("/_authenticated/admin/usuarios/")({
  head: () => ({ meta: [{ title: adminTitle("Usuários") }] }),
  loader: ({ context }) => (context as any).queryClient.ensureQueryData(usersQuery),
  component: UsuariosPage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-destructive">Erro: {error.message}</div>
  ),
});

type UserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  invited_at: string | null;
  invite_pending: boolean;
  invite_last_sent_at: string | null;
  invite_resend_count: number;
  invite_last_success: boolean | null;
  tipo: "admin" | "cliente";
  clientes: string[];
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function UsuariosPage() {
  const queryClient = useQueryClient();
  const { data: users } = useSuspenseQuery(usersQuery);
  const resendFn = useServerFn(resendUserInvite);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "admin" | "cliente" | "pendente">("todos");
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [confirmResend, setConfirmResend] = useState<UserRow | null>(null);

  const resendMut = useMutation({
    mutationFn: (userId: string) =>
      resendFn({
        data: { user_id: userId, client_origin: window.location.origin },
      }),
    onSuccess: () => {
      toast.success("E-mail de convite reenviado com sucesso.");
      setConfirmResend(null);
      void queryClient.invalidateQueries({ queryKey: ["admin", "users-with-roles"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao reenviar convite"),
    onSettled: () => setResendingId(null),
  });

  const all = (users ?? []) as UserRow[];
  const rows = all.filter((u) => {
    if (filter === "pendente" && u.last_sign_in_at) return false;
    if (filter === "admin" && u.tipo !== "admin") return false;
    if (filter === "cliente" && u.tipo !== "cliente") return false;
    if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    todos: all.length,
    admin: all.filter((u) => u.tipo === "admin").length,
    cliente: all.filter((u) => u.tipo === "cliente").length,
    pendente: all.filter((u) => !u.last_sign_in_at).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operações"
        title="Usuários"
        description="Convites pendentes podem receber novo e-mail sem recriar o usuário."
        actions={
          <Link
            to="/admin/usuarios/novo"
            className="lotus-focus inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-[13px] font-medium text-primary-foreground"
          >
            <UserPlus className="h-3.5 w-3.5" /> Novo usuário
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={String(counts.todos)} icon={UsersIcon} />
        <StatCard label="Administradores" value={String(counts.admin)} icon={ShieldCheck} />
        <StatCard label="Clientes" value={String(counts.cliente)} icon={User} />
        <StatCard label="Convite pendente" value={String(counts.pendente)} icon={Clock3} />
      </div>

      <div className="lotus-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-4 py-3">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email…"
              className="pl-9"
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
            {(
              [
                { key: "todos", label: "Todos" },
                { key: "pendente", label: "Pendentes" },
                { key: "admin", label: "Admins" },
                { key: "cliente", label: "Clientes" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors " +
                  (filter === f.key
                    ? "bg-card text-foreground shadow-[var(--shadow-xs)]"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {f.label}
                <span className="text-[10.5px] text-muted-foreground/80">{counts[f.key]}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="lotus-table-scroll">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="lotus-table-head-sticky px-4 py-2.5 font-medium">Usuário</th>
                <th className="lotus-table-head-sticky px-4 py-2.5 font-medium">Tipo</th>
                <th className="lotus-table-head-sticky px-4 py-2.5 font-medium">
                  Clientes vinculados
                </th>
                <th className="lotus-table-head-sticky px-4 py-2.5 font-medium">Cadastrado em</th>
                <th className="lotus-table-head-sticky px-4 py-2.5 font-medium">Convite</th>
                <th className="lotus-table-head-sticky px-4 py-2.5 font-medium">Status</th>
                <th className="lotus-table-head-sticky px-4 py-2.5 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-border/60 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-100 to-secondary-100 text-[12px] font-semibold text-primary-700 dark:from-primary-700/40 dark:to-secondary-700/30 dark:text-primary-100">
                        {(u.email[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-foreground">
                          {u.email}
                        </p>
                        <p className="truncate font-mono text-[10.5px] text-muted-foreground">
                          {u.id.slice(0, 8)}…
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.tipo === "admin" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary-700 dark:text-primary-200">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <User className="h-3 w-3" /> Cliente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.clientes.length === 0 ? (
                      <span className="text-[11.5px] text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {u.clientes.slice(0, 3).map((c) => (
                          <span
                            key={c}
                            className="inline-flex items-center rounded-md border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground"
                          >
                            {c}
                          </span>
                        ))}
                        {u.clientes.length > 3 && (
                          <span className="text-[10.5px] text-muted-foreground">
                            +{u.clientes.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {fmtDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3 text-[11.5px] text-muted-foreground">
                    {u.invite_pending ? (
                      <div className="space-y-0.5">
                        <p>
                          <span className="text-muted-foreground/80">Enviado: </span>
                          {fmtDateTime(u.invited_at ?? u.invite_last_sent_at)}
                        </p>
                        <p>
                          <span className="text-muted-foreground/80">Último envio: </span>
                          {fmtDateTime(u.invite_last_sent_at)}
                        </p>
                        <p>
                          <span className="text-muted-foreground/80">Reenvios: </span>
                          {u.invite_resend_count}
                        </p>
                        {u.invite_last_success === false && (
                          <p className="text-destructive">Último envio falhou</p>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.last_sign_in_at ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2 py-0.5 text-[11px] font-medium text-[color:var(--success)]">
                        <CheckCircle2 className="h-3 w-3" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <Clock3 className="h-3 w-3" /> Convite pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!u.last_sign_in_at && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-[11px]"
                        disabled={resendingId === u.id || resendMut.isPending}
                        onClick={() => setConfirmResend(u)}
                      >
                        <Send className="h-3 w-3" />
                        Reenviar e-mail
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmResend}
        onOpenChange={(open) => !open && setConfirmResend(null)}
        title="Reenviar e-mail de convite?"
        description={
          confirmResend ? (
            <>
              Um novo e-mail será enviado para{" "}
              <span className="font-medium text-foreground">{confirmResend.email}</span> com o link
              correto de acesso. O usuário não será recriado.
            </>
          ) : undefined
        }
        confirmLabel="Reenviar e-mail"
        onConfirm={() => {
          if (!confirmResend) return;
          setResendingId(confirmResend.id);
          resendMut.mutate(confirmResend.id);
        }}
      />
    </div>
  );
}
