import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense, type ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Instagram,
  Facebook,
  BarChart3,
  Globe,
  Music2,
  LayoutDashboard,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------- Shared helpers (used by child routes) ----------------

export type ClienteRef = { slug: string; nome: string; queryName: string };

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const clienteRefQuery = (slug: string) =>
  queryOptions({
    queryKey: ["cliente-ref", slug],
    queryFn: async (): Promise<ClienteRef | null> => {
      const { data: cad } = await supabase
        .from("cadastro_clientes")
        .select("slug, nome_cliente")
        .eq("slug", slug)
        .maybeSingle();

      const { data: ativos, error: errAtivos } = await supabase
        .from("vw_clientes_ativos")
        .select("cliente");
      if (errAtivos) throw errAtivos;

      const match = (ativos ?? []).find((r: { cliente: string }) => slugify(r.cliente) === slug);
      const queryName = match?.cliente ?? cad?.nome_cliente ?? null;
      if (!queryName) {
        console.warn("[cliente-ref] sem match para slug", slug);
        return null;
      }
      return {
        slug,
        nome: cad?.nome_cliente ?? queryName,
        queryName,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

export type PlatformKey =
  | "instagram"
  | "meta-ads"
  | "google-ads"
  | "ga4"
  | "google-business"
  | "tiktok";

export const clientePlatformsQuery = (queryName: string) =>
  queryOptions({
    queryKey: ["cliente-platforms", queryName],
    queryFn: async (): Promise<PlatformKey[]> => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceStr = since.toISOString().slice(0, 10);

      const [ov, gbp] = await Promise.all([
        supabase
          .from("vw_overview_cliente")
          .select("meta_spend, google_spend, sessions, conversions, reach, engagement")
          .eq("cliente", queryName)
          .gte("data", sinceStr),
        supabase
          .from("vw_google_business_diario")
          .select("cliente")
          .eq("cliente", queryName)
          .gte("data", sinceStr)
          .limit(1),
      ]);

      const rows = (ov.data ?? []) as Array<Record<string, number | null>>;
      const agg = rows.reduce<{
        meta: number;
        google: number;
        ga4: number;
        ig: number;
      }>(
        (a, r) => ({
          meta: a.meta + Number(r.meta_spend ?? 0),
          google: a.google + Number(r.google_spend ?? 0),
          ga4: a.ga4 + Number(r.sessions ?? 0) + Number(r.conversions ?? 0),
          ig: a.ig + Number(r.reach ?? 0) + Number(r.engagement ?? 0),
        }),
        { meta: 0, google: 0, ga4: 0, ig: 0 },
      );

      const out: PlatformKey[] = [];
      if (agg.ig > 0) out.push("instagram");
      if (agg.meta > 0) out.push("meta-ads");
      if (agg.google > 0) out.push("google-ads");
      if (agg.ga4 > 0) out.push("ga4");
      if ((gbp.data ?? []).length > 0) out.push("google-business");
      // TikTok: ainda sem view própria — só aparece quando houver dados.
      return out;
    },
    staleTime: 5 * 60 * 1000,
  });

const PLATFORM_META: Record<PlatformKey, { label: string; icon: LucideIcon; path: string }> = {
  instagram: {
    label: "Instagram",
    icon: Instagram,
    path: "/cliente/$cliente/instagram",
  },
  "meta-ads": {
    label: "Meta Ads",
    icon: Facebook,
    path: "/cliente/$cliente/meta-ads",
  },
  "google-ads": {
    label: "Google Ads",
    icon: Megaphone,
    path: "/cliente/$cliente/google-ads",
  },
  ga4: {
    label: "Google Analytics 4",
    icon: BarChart3,
    path: "/cliente/$cliente/ga4",
  },
  "google-business": {
    label: "Google Business",
    icon: Globe,
    path: "/cliente/$cliente/google-business",
  },
  tiktok: {
    label: "TikTok",
    icon: Music2,
    path: "/cliente/$cliente/tiktok",
  },
};

// ---------------- Route ----------------

export const Route = createFileRoute("/_authenticated/cliente/$cliente")({
  head: ({ params }) => ({ meta: [{ title: `${params.cliente} · Lotus` }] }),
  component: ClienteLayout,
  errorComponent: ({ error }) => (
    <div className="lotus-surface p-4 text-sm text-danger">Erro: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="lotus-surface p-6 text-sm text-muted-foreground">Cliente não encontrado.</div>
  ),
});

function ClienteLayout() {
  const { cliente: slug } = Route.useParams();

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar ao painel
        </Link>
      </div>

      <Suspense fallback={<LayoutSkeleton />}>
        <ClienteShell slug={slug} />
      </Suspense>
    </div>
  );
}

function LayoutSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="lotus-skeleton h-64 w-full" />
      <div className="lotus-skeleton h-96 w-full" />
    </div>
  );
}

function ClienteShell({ slug }: { slug: string }) {
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));

  if (!ref) {
    return (
      <div className="lotus-surface p-6 text-sm text-muted-foreground">
        Cliente não encontrado para o identificador <strong>{slug}</strong>.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Suspense fallback={<div className="lotus-skeleton h-48 w-full rounded-xl" />}>
          <PlatformSideNav slug={slug} queryName={ref.queryName} />
        </Suspense>
      </aside>
      <div className="min-w-0">
        <Outlet />
      </div>
    </div>
  );
}

function PlatformSideNav({ slug, queryName }: { slug: string; queryName: string }) {
  const { data: platforms } = useSuspenseQuery(clientePlatformsQuery(queryName));
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="lotus-surface flex flex-col gap-0.5 p-2">
      <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Conta
      </p>
      <SubNavLink
        to="/cliente/$cliente"
        params={{ cliente: slug }}
        pathname={pathname}
        href={`/cliente/${slug}`}
        icon={LayoutDashboard}
        label="Visão geral"
        exact
      />

      <p className="mt-3 px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Plataformas
      </p>

      {platforms.length === 0 && (
        <p className="px-3 py-2 text-[11.5px] text-muted-foreground">
          Nenhuma plataforma com dados ainda.
        </p>
      )}

      {platforms.map((p) => {
        const meta = PLATFORM_META[p];
        const href = meta.path.replace("$cliente", slug);
        return (
          <SubNavLink
            key={p}
            to={meta.path}
            params={{ cliente: slug }}
            pathname={pathname}
            href={href}
            icon={meta.icon}
            label={meta.label}
          />
        );
      })}
    </nav>
  );
}

function SubNavLink({
  to,
  params,
  href,
  label,
  icon: Icon,
  pathname,
  exact,
}: {
  to: string;
  params: Record<string, string>;
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  pathname: string;
  exact?: boolean;
}) {
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      to={to as never}
      params={params as never}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-primary/12 text-primary-700 dark:text-primary-200"
          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
