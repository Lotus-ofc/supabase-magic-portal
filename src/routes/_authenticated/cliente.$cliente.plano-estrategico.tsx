import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Compass } from "lucide-react";
import { listPlanos } from "@/lib/strategic-plan.functions";
import { clienteRefQuery } from "./cliente.$cliente";
import { PageHeader } from "@/components/lotus/PageHeader";
import { SectionCard } from "@/components/lotus/SectionCard";
import { EmptyState } from "@/components/lotus/EmptyState";
import { brandTitle } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/plano-estrategico")({
  head: ({ params }) => ({
    meta: [{ title: brandTitle(`Plano Estratégico · ${params.cliente}`) }],
  }),
  component: ClientePlanoListPage,
});

function ClientePlanoListPage() {
  const { cliente: slug } = Route.useParams();
  return (
    <Suspense fallback={<div className="lotus-skeleton h-48 w-full rounded-xl" />}>
      <ClientePlanoList slug={slug} />
    </Suspense>
  );
}

function ClientePlanoList({ slug }: { slug: string }) {
  const navigate = useNavigate();
  const { data: ref } = useSuspenseQuery(clienteRefQuery(slug));
  const listFn = useServerFn(listPlanos);
  const { data: planos } = useSuspenseQuery({
    queryKey: ["strategic-plan", "cliente-list", ref?.queryName],
    queryFn: async () => {
      if (!ref) return [];
      const all = await listFn({ data: {} });
      return (all ?? []).filter((p: { cliente_nome: string }) => p.cliente_nome === ref.queryName);
    },
  });

  useEffect(() => {
    const ativo = (planos ?? []).find((p: { status: string }) => p.status === "ativo");
    if (ativo && (planos ?? []).length === 1) {
      void navigate({
        to: "/cliente/$cliente/plano-estrategico/$planoId",
        params: { cliente: slug, planoId: ativo.id },
        replace: true,
      });
    }
  }, [planos, slug, navigate]);

  if (!ref) {
    return <div className="text-sm text-muted-foreground">Cliente não encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Centro Estratégico"
        title="Planos estratégicos"
        description={`Planos de ${ref.nome}`}
      />
      {(planos ?? []).length === 0 ? (
        <SectionCard title="Nenhum plano">
          <EmptyState
            icon={Compass}
            title="Plano estratégico não configurado"
            description="Entre em contato com a agência para iniciar o planejamento estratégico."
          />
        </SectionCard>
      ) : (
        <div className="space-y-3">
          {(planos ?? []).map(
            (p: {
              id: string;
              titulo: string;
              status: string;
              periodo_inicio: string;
              periodo_fim: string;
            }) => (
              <Link
                key={p.id}
                to="/cliente/$cliente/plano-estrategico/$planoId"
                params={{ cliente: slug, planoId: p.id }}
                className="lotus-surface block p-4 hover:border-primary/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="font-medium text-foreground">{p.titulo}</h3>
                    <p className="text-xs text-muted-foreground">
                      {p.periodo_inicio} — {p.periodo_fim}
                    </p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase">
                    {p.status}
                  </span>
                </div>
              </Link>
            ),
          )}
        </div>
      )}
    </div>
  );
}
