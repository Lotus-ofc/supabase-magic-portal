import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { createCliente } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/clientes/novo")({
  component: NovoCliente,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function NovoCliente() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const finalSlug = slug || slugify(nome);
      const row = await createCliente({
        data: {
          nome_cliente: nome,
          slug: finalSlug,
          ativo: true,
          empresa: empresa || null,
          email_principal: email || null,
          telefone: telefone || null,
          instagram_ativo: false,
        },
      });
      router.navigate({ to: "/admin/clientes/$id", params: { id: String((row as any).id) } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-lg font-semibold">Novo cliente</h2>
      <form onSubmit={submit} className="space-y-4 rounded-md border border-border p-6">
        <Field label="Nome do cliente *">
          <input
            required
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              if (!slug) setSlug(slugify(e.target.value));
            }}
            className="input"
          />
        </Field>
        <Field label="Slug (URL) *">
          <input
            required
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="ex: cliente-acme"
            className="input"
          />
        </Field>
        <Field label="Empresa">
          <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email principal">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Telefone">
            <input
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="input"
            />
          </Field>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.navigate({ to: "/admin/clientes" })}
            className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {loading ? "Salvando…" : "Criar cliente"}
          </button>
        </div>
      </form>
      <style>{`.input{margin-top:.25rem;width:100%;border-radius:.375rem;border:1px solid hsl(var(--input));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
