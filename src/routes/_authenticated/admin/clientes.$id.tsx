import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getCliente,
  listServicos,
  listUsers,
  updateCliente,
  setClienteServicos,
  grantClientAccess,
  revokeClientAccess,
  toggleClienteAtivo,
} from "@/lib/admin.functions";

const detailQuery = (id: number) => ({
  queryKey: ["admin", "cliente", id],
  queryFn: () => getCliente({ data: { id } }),
});
const servicosQuery = { queryKey: ["admin", "servicos"], queryFn: () => listServicos() };
const usersQuery = { queryKey: ["admin", "users"], queryFn: () => listUsers() };

export const Route = createFileRoute("/_authenticated/admin/clientes/$id")({
  loader: async ({ params, context }) => {
    const id = Number(params.id);
    const qc = (context as any).queryClient;
    await Promise.all([
      qc.ensureQueryData(detailQuery(id)),
      qc.ensureQueryData(servicosQuery),
      qc.ensureQueryData(usersQuery),
    ]);
    return { id };
  },
  component: ClienteEdit,
  errorComponent: ({ error }) => <p className="text-sm text-destructive">Erro: {error.message}</p>,
});

type Tab = "dados" | "plataformas" | "servicos" | "acessos";

function normFlag(v: string | null | undefined): boolean {
  if (!v) return false;
  return ["true", "sim", "1", "x", "ativo", "yes"].includes(String(v).trim().toLowerCase());
}
function toFlag(b: boolean): string {
  return b ? "true" : "false";
}

function ClienteEdit() {
  const { id } = Route.useLoaderData();
  const { data: detail } = useSuspenseQuery(detailQuery(id));
  const { data: servicos } = useSuspenseQuery(servicosQuery);
  const { data: users } = useSuspenseQuery(usersQuery);
  const qc = useQueryClient();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>("dados");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const c: any = detail.cliente;

  const [form, setForm] = useState({
    nome_cliente: c.nome_cliente ?? "",
    slug: c.slug ?? "",
    empresa: c.empresa ?? "",
    email_principal: c.email_principal ?? "",
    telefone: c.telefone ?? "",
    observacoes: c.observacoes ?? "",
    data_inicio: c.data_inicio ?? "",
    valor_mensal: c.valor_mensal ?? "",
    mlabs_url: c.mlabs_url ?? "",
    google_business_location_id: c.google_business_location_id ?? "",
    google_ads_ativo: normFlag(c.google_ads_ativo),
    meta_ativo: normFlag(c.meta_ativo),
    ga4_ativo: normFlag(c.ga4_ativo),
    google_business_ativo: normFlag(c.google_business_ativo),
    instagram_ativo: !!c.instagram_ativo,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const saveDados = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await updateCliente({
        data: {
          id,
          nome_cliente: form.nome_cliente,
          slug: form.slug,
          empresa: form.empresa || null,
          email_principal: form.email_principal || null,
          telefone: form.telefone || null,
          observacoes: form.observacoes || null,
          data_inicio: form.data_inicio || null,
          valor_mensal: form.valor_mensal === "" ? null : Number(form.valor_mensal),
          mlabs_url: form.mlabs_url || null,
          google_business_location_id: form.google_business_location_id || null,
          google_ads_ativo: toFlag(form.google_ads_ativo),
          meta_ativo: toFlag(form.meta_ativo),
          ga4_ativo: toFlag(form.ga4_ativo),
          google_business_ativo: toFlag(form.google_business_ativo),
          instagram_ativo: form.instagram_ativo,
        },
      });
      setMsg("Salvo.");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/admin/clientes" className="text-xs text-muted-foreground hover:underline">
            ← Voltar
          </Link>
          <h2 className="mt-1 text-lg font-semibold">{c.nome_cliente}</h2>
          <p className="text-xs text-muted-foreground">
            ID {c.id} · slug <code>{c.slug ?? "—"}</code> · {c.ativo ? "Ativo" : "Inativo"}
          </p>
        </div>
        <button
          onClick={async () => {
            if (c.ativo && !confirm("Desativar cliente?")) return;
            await toggleClienteAtivo({ data: { id, ativo: !c.ativo } });
            await qc.invalidateQueries({ queryKey: ["admin"] });
            await router.invalidate();
          }}
          className="rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent"
        >
          {c.ativo ? "Desativar" : "Reativar"}
        </button>
      </div>

      <div className="flex gap-1 border-b border-border text-sm">
        {(["dados", "plataformas", "servicos", "acessos"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 capitalize ${
              tab === t
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "dados" && (
        <div className="space-y-3 rounded-md border border-border p-5">
          <Row>
            <Field label="Nome">
              <input
                value={form.nome_cliente}
                onChange={(e) => set("nome_cliente", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Slug">
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                className="input"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Empresa">
              <input
                value={form.empresa}
                onChange={(e) => set("empresa", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Email principal">
              <input
                type="email"
                value={form.email_principal}
                onChange={(e) => set("email_principal", e.target.value)}
                className="input"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Telefone">
              <input
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Data de início">
              <input
                type="date"
                value={form.data_inicio ?? ""}
                onChange={(e) => set("data_inicio", e.target.value)}
                className="input"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Valor mensal (R$)">
              <input
                type="number"
                step="0.01"
                value={form.valor_mensal as any}
                onChange={(e) => set("valor_mensal", e.target.value)}
                className="input"
              />
            </Field>
            <Field label="mLabs URL">
              <input
                value={form.mlabs_url}
                onChange={(e) => set("mlabs_url", e.target.value)}
                className="input"
              />
            </Field>
          </Row>
          <Field label="Observações">
            <textarea
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              rows={3}
              className="input"
            />
          </Field>
          <ActionBar saving={saving} msg={msg} onSave={saveDados} />
        </div>
      )}

      {tab === "plataformas" && (
        <div className="space-y-3 rounded-md border border-border p-5">
          <p className="text-xs text-muted-foreground">
            Flags armazenadas como texto (<code>"true"/"false"</code>) para compatibilidade com o
            Make.com.
          </p>
          {[
            ["google_ads_ativo", "Google Ads"],
            ["meta_ativo", "Meta Ads"],
            ["ga4_ativo", "Google Analytics 4"],
            ["google_business_ativo", "Google Meu Negócio"],
            ["instagram_ativo", "Instagram"],
          ].map(([k, label]) => (
            <label key={k} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm">{label}</span>
              <input
                type="checkbox"
                checked={(form as any)[k]}
                onChange={(e) => set(k, e.target.checked)}
              />
            </label>
          ))}
          <Field label="Google Business Location ID">
            <input
              value={form.google_business_location_id}
              onChange={(e) => set("google_business_location_id", e.target.value)}
              className="input"
            />
          </Field>
          <ActionBar saving={saving} msg={msg} onSave={saveDados} />
        </div>
      )}

      {tab === "servicos" && (
        <ServicosTab
          clienteId={id}
          servicos={servicos as any[]}
          current={detail.servicos as any[]}
        />
      )}

      {tab === "acessos" && (
        <AcessosTab
          clienteId={id}
          users={users as any[]}
          acessos={detail.acessos as any[]}
        />
      )}

      <style>{`.input{margin-top:.25rem;width:100%;border-radius:.375rem;border:1px solid hsl(var(--input));background:hsl(var(--background));padding:.5rem .75rem;font-size:.875rem}`}</style>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
function ActionBar({
  saving,
  msg,
  onSave,
}: {
  saving: boolean;
  msg: string | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      <button
        onClick={onSave}
        disabled={saving}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
    </div>
  );
}

function ServicosTab({
  clienteId,
  servicos,
  current,
}: {
  clienteId: number;
  servicos: any[];
  current: any[];
}) {
  const qc = useQueryClient();
  const [state, setState] = useState(() => {
    const map = new Map(current.map((c) => [c.servico_id, c]));
    return servicos.map((s) => {
      const cur = map.get(s.id);
      return {
        servico_id: s.id,
        nome: s.nome,
        selected: !!cur && cur.ativo,
        valor: cur?.valor ?? "",
      };
    });
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await setClienteServicos({
        data: {
          cadastro_cliente_id: clienteId,
          items: state
            .filter((s) => s.selected)
            .map((s) => ({
              servico_id: s.servico_id,
              ativo: true,
              valor: s.valor === "" ? null : Number(s.valor),
            })),
        },
      });
      setMsg("Salvo.");
      await qc.invalidateQueries({ queryKey: ["admin"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-5">
      {state.map((s, i) => (
        <div
          key={s.servico_id}
          className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
        >
          <input
            type="checkbox"
            checked={s.selected}
            onChange={(e) =>
              setState((prev) =>
                prev.map((p, j) => (j === i ? { ...p, selected: e.target.checked } : p)),
              )
            }
          />
          <span className="flex-1 text-sm">{s.nome}</span>
          <input
            type="number"
            step="0.01"
            placeholder="Valor R$"
            value={s.valor}
            onChange={(e) =>
              setState((prev) => prev.map((p, j) => (j === i ? { ...p, valor: e.target.value } : p)))
            }
            disabled={!s.selected}
            className="w-32 rounded-md border border-input bg-background px-2 py-1 text-sm disabled:opacity-50"
          />
        </div>
      ))}
      <ActionBar saving={saving} msg={msg} onSave={save} />
    </div>
  );
}

function AcessosTab({
  clienteId,
  users,
  acessos,
}: {
  clienteId: number;
  users: any[];
  acessos: any[];
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const usedIds = useMemo(() => new Set(acessos.map((a) => a.user_id)), [acessos]);
  const available = users.filter((u) => !usedIds.has(u.id));

  const grant = async () => {
    if (!userId) return;
    try {
      await grantClientAccess({ data: { user_id: userId, cadastro_cliente_id: clienteId } });
      setUserId("");
      await qc.invalidateQueries({ queryKey: ["admin"] });
      await router.invalidate();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro");
    }
  };
  const revoke = async (id: string) => {
    if (!confirm("Revogar acesso deste usuário?")) return;
    await revokeClientAccess({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["admin"] });
    await router.invalidate();
  };

  return (
    <div className="space-y-3 rounded-md border border-border p-5">
      <div className="flex items-center gap-2">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">Selecione um usuário…</option>
          {available.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>
        <button
          onClick={grant}
          disabled={!userId}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Conceder acesso
        </button>
      </div>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
      <ul className="divide-y divide-border rounded-md border border-border">
        {acessos.length === 0 && (
          <li className="px-3 py-3 text-sm text-muted-foreground">Nenhum acesso concedido.</li>
        )}
        {acessos.map((a) => {
          const u = users.find((x) => x.id === a.user_id);
          return (
            <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
              <span>{u?.email ?? a.user_id}</span>
              <button
                onClick={() => revoke(a.id)}
                className="rounded-md border border-input px-2 py-1 text-xs hover:bg-accent"
              >
                Revogar
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
