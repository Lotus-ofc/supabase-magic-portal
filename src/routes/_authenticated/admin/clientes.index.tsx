import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listClientes,
  deactivateCliente,
  toggleClienteAtivo,
} from "@/lib/admin.functions";

const clientesQuery = {
  queryKey: ["admin", "clientes"],
  queryFn: () => listClientes(),
};

export const Route = createFileRoute("/_authenticated/admin/clientes/")({
  loader: ({ context }) => (context as any).queryClient?.ensureQueryData(clientesQuery),
  component: ClientesList,
  errorComponent: ({ error }) => (
    <p className="text-sm text-destructive">Erro: {error.message}</p>
  ),
});

function ClientesList() {
  const { data } = useSuspenseQuery(clientesQuery);
  const qc = useQueryClient();
  const router = useRouter();
  const [filter, setFilter] = useState<"todos" | "ativos" | "inativos">("ativos");
  const [search, setSearch] = useState("");

  const rows = (data ?? []).filter((c: any) => {
    if (filter === "ativos" && !c.ativo) return false;
    if (filter === "inativos" && c.ativo) return false;
    if (search && !c.nome_cliente.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggle = async (id: number, ativo: boolean) => {
    if (!ativo && !confirm("Desativar este cliente? Histórico será preservado.")) return;
    await toggleClienteAtivo({ data: { id, ativo } });
    await qc.invalidateQueries({ queryKey: ["admin", "clientes"] });
    await router.invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            placeholder="Buscar por nome…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="ativos">Ativos</option>
            <option value="inativos">Inativos</option>
            <option value="todos">Todos</option>
          </select>
        </div>
        <Link
          to="/admin/clientes/novo"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Novo cliente
        </Link>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Cliente</th>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Serviços</th>
              <th className="px-3 py-2">Acessos</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  Nenhum cliente.
                </td>
              </tr>
            )}
            {rows.map((c: any) => (
              <tr key={c.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">
                  <Link
                    to="/admin/clientes/$id"
                    params={{ id: String(c.id) }}
                    className="hover:underline"
                  >
                    {c.nome_cliente}
                  </Link>
                  {c.slug && <span className="ml-2 text-xs text-muted-foreground">/{c.slug}</span>}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.empresa ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {c.servicos?.length ? c.servicos.join(", ") : "—"}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{c.qtd_acessos ?? 0}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.ativo
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => toggle(c.id, !c.ativo)}
                    className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
                  >
                    {c.ativo ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Soft delete apenas. Histórico de métricas, acessos e serviços é sempre preservado.
      </p>
    </div>
  );
}
