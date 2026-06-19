import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Platform = "meta" | "google" | "ga4" | "instagram";

const viewFor = (p: Platform) =>
  ({
    meta: "vw_meta_ads_diario",
    google: "vw_google_ads_diario",
    ga4: "vw_ga4_diario",
    instagram: "vw_instagram_diario",
  })[p];

const dailyQuery = (cliente: string, platform: Platform, days: number) =>
  queryOptions({
    queryKey: ["cliente-daily", cliente, platform, days],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data, error } = await supabase
        .from(viewFor(platform))
        .select("*")
        .eq("cliente", cliente)
        .gte("data", since.toISOString().slice(0, 10))
        .order("data", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<Record<string, unknown>>;
    },
  });

export const Route = createFileRoute("/_authenticated/cliente/$cliente")({
  head: ({ params }) => ({ meta: [{ title: `${params.cliente} · Majrá` }] }),
  component: ClientePage,
  errorComponent: ({ error }) => (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      Erro: {error.message}
    </div>
  ),
  notFoundComponent: () => <div>Cliente não encontrado</div>,
});

const TABS: { id: Platform; label: string }[] = [
  { id: "meta", label: "Meta Ads" },
  { id: "google", label: "Google Ads" },
  { id: "ga4", label: "GA4" },
  { id: "instagram", label: "Instagram" },
];

function ClientePage() {
  const { cliente } = Route.useParams();
  const [tab, setTab] = useState<Platform>("meta");
  const [days, setDays] = useState(30);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{cliente}</h1>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value={7}>Últimos 7 dias</option>
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
        </select>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Suspense fallback={<div className="text-sm text-muted-foreground">Carregando…</div>}>
        <PlatformTable cliente={cliente} platform={tab} days={days} />
      </Suspense>
    </div>
  );
}

function PlatformTable({
  cliente,
  platform,
  days,
}: {
  cliente: string;
  platform: Platform;
  days: number;
}) {
  const { data } = useSuspenseQuery(dailyQuery(cliente, platform, days));

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-border bg-card p-6 text-sm text-muted-foreground">
        Sem dados para este período.
      </div>
    );
  }

  const cols = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-3 py-2 text-left font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, i) => (
            <tr key={i}>
              {cols.map((c) => {
                const v = row[c];
                const display =
                  v == null
                    ? "—"
                    : typeof v === "number"
                      ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                      : String(v);
                return (
                  <td key={c} className="px-3 py-2 whitespace-nowrap">
                    {display}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
