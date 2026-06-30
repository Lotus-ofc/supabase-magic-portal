import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, ExternalLink } from "lucide-react";
import { listPlanos, createPlano } from "@/lib/strategic-plan.functions";
import { listClientes } from "@/lib/admin.functions";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/lotus/FormField";
import { adminTitle } from "@/lib/brand";
import { slugify } from "@/lib/slug";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/plano-estrategico")({
  head: () => ({ meta: [{ title: adminTitle("Plano Estratégico") }] }),
  component: AdminPlanoPage,
});

function AdminPlanoPage() {
  const listFn = useServerFn(listPlanos);
  const createFn = useServerFn(createPlano);
  const { data: planos, refetch } = useQuery({
    queryKey: ["strategic-plan", "admin"],
    queryFn: () => listFn({ data: { status: "ativo" } }),
  });
  const { data: clientes } = useQuery({
    queryKey: ["admin", "clientes-list"],
    queryFn: () => listClientes(),
  });

  const [showForm, setShowForm] = useState(false);
  const [clienteId, setClienteId] = useState("");
  const [titulo, setTitulo] = useState("");

  const clientesSemPlano = (clientes ?? []).filter(
    (c: { id: number; nome_cliente: string }) =>
      !(planos ?? []).some((p: { cadastro_cliente_id: number }) => p.cadastro_cliente_id === c.id),
  );

  const handleCreate = async () => {
    if (!clienteId) return;
    try {
      await createFn({
        data: {
          cadastro_cliente_id: Number(clienteId),
          titulo: titulo.trim() || undefined,
        },
      });
      toast.success("Plano Estratégico criado");
      setShowForm(false);
      setTitulo("");
      setClienteId("");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar plano");
    }
  };

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Centro Estratégico"
        title="Planos Estratégicos"
        description="Um plano contínuo por cliente. A evolução acontece por objetivos estratégicos."
        actions={
          clientesSemPlano.length > 0 ? (
            <Button size="sm" className="gap-1.5" onClick={() => setShowForm((v) => !v)}>
              <Plus className="h-3.5 w-3.5" />
              Criar plano
            </Button>
          ) : undefined
        }
      />

      {showForm && (
        <SectionCard title="Criar Plano Estratégico" className="max-w-lg">
          <div className="space-y-3">
            <Field
              label="Cliente"
              required
              hint="Cada cliente pode ter apenas um Plano Estratégico ativo."
            >
              <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                <option value="">Selecione o cliente</option>
                {clientesSemPlano.map((c: { id: number; nome_cliente: string }) => (
                  <option key={c.id} value={c.id}>
                    {c.nome_cliente}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Nome do plano (opcional)">
              <TextInput
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex.: Plano Estratégico · Nome do cliente"
              />
            </Field>
            <Button size="sm" onClick={handleCreate} disabled={!clienteId}>
              Criar
            </Button>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Clientes com plano ativo">
        <div className="space-y-2">
          {(planos ?? []).map((p: { id: string; titulo: string; cliente_nome: string }) => (
            <Link
              key={p.id}
              to="/cliente/$cliente/plano-estrategico/$planoId"
              params={{ cliente: slugify(p.cliente_nome), planoId: p.id }}
              className="flex items-center justify-between rounded-lg border border-border/70 px-4 py-3 hover:border-primary/30"
            >
              <div>
                <p className="font-medium text-foreground">{p.titulo}</p>
                <p className="text-xs text-muted-foreground">{p.cliente_nome}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
          {(planos ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum plano ativo. Crie o primeiro plano para um cliente.
            </p>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
