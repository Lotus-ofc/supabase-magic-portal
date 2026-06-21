import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/lotus/PageHeader";
import { cn } from "@/lib/utils";
import { ArrowLeft, Inbox } from "lucide-react";

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
  head: ({ params }) => ({ meta: [{ title: `${params.cliente} · Lotus` }] }),
  component: ClientePage,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-destructive">Erro: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="lotus-surface p-6 text-sm text-muted-foreground">Cliente não encontrado.</div>
  ),
});

const TABS: { id: Platform; label: string }[] = [
  { id: "meta", label: "Meta Ads" },
  { id: "google", label: "Google Ads" },
  { id: "ga4", label: "GA4" },
  { id: "instagram", label: "Instagram" },
];

const PERIODOS = [
  { d: 7, label: "7 dias" },
  { d: 30, label: "30 dias" },
  { d: 90, label: "90 dias" },
] as const;

function ClientePage() {
  const { cliente } = Route.useParams();
  const [tab, setTab] = useState<Platform>("meta");
  const [days, setDays] = useState<7 | 30 | 90>(30);

  return (
    <div className="space-y-7">
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar ao painel
        </Link>
      </div>

      <PageHeader
        eyebrow="Conta cliente"
        title={cliente}
        description="Dados diários por plataforma, atualizados automaticamente."
        actions={
          <div role="tablist" aria-label="Período" className="lotus-surface inline-flex p-0.5">
            {PERIODOS.map((p) => (
              <button
                key={p.d}
                role="tab"
                aria-selected={days === p.d}
                onClick={() => setDays(p.d)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  days === p.d
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-xs)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="lotus-surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-1 border-b border-border/70 px-2 py-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                tab === t.id
                  ? "bg-primary/12 text-primary-700 dark:text-primary-200"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Suspense
          fallback={
            <div className="space-y-2 p-4">
              <div className="lotus-skeleton h-4 w-1/3" />
              <div className="lotus-skeleton h-3 w-2/3" />
              <div className="lotus-skeleton h-3 w-1/2" />
            </div>
          }
        >
          <PlatformTable cliente={cliente} platform={tab} days={days} />
        </Suspense>
      </div>
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
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[13.5px] font-medium text-foreground">Sem dados neste período</p>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Quando a integração enviar novos registros, eles aparecem aqui automaticamente.
          </p>
        </div>
      </div>
    );
  }

  const cols = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
            {cols.map((c) => (
              <th key={c} className="px-4 py-2.5 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-t border-border/60 hover:bg-muted/20">
              {cols.map((c) => {
                const v = row[c];
                const display =
                  v == null
                    ? "—"
                    : typeof v === "number"
                      ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                      : String(v);
                return (
                  <td key={c} className="whitespace-nowrap px-4 py-2.5 tabular-nums text-foreground">
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
