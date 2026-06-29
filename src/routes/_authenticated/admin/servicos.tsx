import { createFileRoute } from "@tanstack/react-router";
import { adminTitle } from "@/lib/brand";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listServicos, upsertServico } from "@/lib/admin.functions";

const servicosQuery = { queryKey: ["admin", "servicos"], queryFn: () => listServicos() };

export const Route = createFileRoute("/_authenticated/admin/servicos")({
  head: () => ({ meta: [{ title: adminTitle("Serviços") }] }),
  loader: ({ context }) => (context as any).queryClient.ensureQueryData(servicosQuery),
  component: ServicosAdmin,
  errorComponent: ({ error }) => <p className="text-sm text-destructive">Erro: {error.message}</p>,
});

function ServicosAdmin() {
  const { data } = useSuspenseQuery(servicosQuery);
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await upsertServico({ data: { nome, descricao, ativo: true } });
      setNome("");
      setDescricao("");
      await qc.invalidateQueries({ queryKey: ["admin", "servicos"] });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Erro");
    }
  };

  const toggle = async (s: any) => {
    await upsertServico({
      data: { id: s.id, nome: s.nome, descricao: s.descricao, ativo: !s.ativo },
    });
    await qc.invalidateQueries({ queryKey: ["admin", "servicos"] });
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={create}
        className="flex flex-wrap items-end gap-2 rounded-md border border-border p-4"
      >
        <div className="flex-1">
          <label className="text-xs font-medium">Nome</label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex-[2]">
          <label className="text-xs font-medium">Descrição</label>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Adicionar
        </button>
      </form>
      {msg && <p className="text-xs text-destructive">{msg}</p>}

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Serviço</th>
              <th className="px-3 py-2">Descrição</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((s: any) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{s.nome}</td>
                <td className="px-3 py-2 text-muted-foreground">{s.descricao ?? "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      s.ativo
                        ? "bg-emerald-500/15 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.ativo ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => toggle(s)}
                    className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
                  >
                    {s.ativo ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
