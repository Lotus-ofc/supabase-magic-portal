import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listUsersWithRoles } from "@/lib/admin.functions";
import { PageHeader } from "@/components/lotus/PageHeader";
import { StatCard } from "@/components/lotus/StatCard";
import { TextInput } from "@/components/lotus/FormField";
import { Search, ShieldCheck, User, UserPlus, Users as UsersIcon, CheckCircle2, Clock3 } from "lucide-react";

const usersQuery = {
  queryKey: ["admin", "users-with-roles"],
  queryFn: () => listUsersWithRoles(),
};

export const Route = createFileRoute("/_authenticated/admin/usuarios")({
  head: () => ({ meta: [{ title: "Usuários · Admin Lotus" }] }),
  loader: ({ context }) => (context as any).queryClient.ensureQueryData(usersQuery),
  component: UsuariosPage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-destructive">Erro: {error.message}</div>
  ),
});

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
  const { data: users } = useSuspenseQuery(usersQuery);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "admin" | "cliente">("todos");

  const all = users ?? [];
  const rows = all.filter((u: any) => {
    if (filter !== "todos" && u.tipo !== filter) return false;
    if (search && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    todos: all.length,
    admin: all.filter((u: any) => u.tipo === "admin").length,
    cliente: all.filter((u: any) => u.tipo === "cliente").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operações"
        title="Usuários"
        description="Todos os usuários cadastrados na plataforma. Aqui você acompanha quem tem acesso administrativo ou de cliente."
      />

      <div className="lotus-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por email…"
              className="pl-9"
            />
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
            {(
              [
                { key: "todos", label: "Todos" },
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

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Usuário</th>
                <th className="px-4 py-2.5 font-medium">Tipo</th>
                <th className="px-4 py-2.5 font-medium">Clientes vinculados</th>
                <th className="px-4 py-2.5 font-medium">Cadastrado em</th>
                <th className="px-4 py-2.5 font-medium">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
              {rows.map((u: any) => (
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
                        {u.clientes.slice(0, 3).map((c: string) => (
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
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {fmtDate(u.last_sign_in_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lotus-surface flex items-start gap-3 p-4 text-[12.5px]">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="text-muted-foreground">
          <p className="font-medium text-foreground">Criação de usuário cliente</p>
          <p className="mt-1">
            Hoje o convite/cadastro de novos usuários ainda é feito fora do painel. Use o sign-up
            normal em{" "}
            <Link to="/auth" className="text-primary hover:underline">
              /auth
            </Link>{" "}
            ou peça o cadastro ao próprio cliente, depois conceda o acesso ao registro dele em{" "}
            <Link to="/admin/clientes" className="text-primary hover:underline">
              Clientes → Acessos
            </Link>
            . Em breve esta tela permitirá enviar convites por email.
          </p>
        </div>
      </div>
    </div>
  );
}
