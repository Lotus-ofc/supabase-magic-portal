import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getStrategicDashboard } from "@/lib/strategic-plan.functions";
import { checkIsAdmin } from "@/lib/admin.functions";
import { StrategicPlanCentro } from "@/components/lotus/strategic-plan/StrategicPlanCentro";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { brandTitle } from "@/lib/brand";
import { clienteRefQuery } from "./cliente.$cliente";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/plano-estrategico/$planoId")(
  {
    head: ({ params }) => ({
      meta: [{ title: brandTitle(`Centro Estratégico · ${params.cliente}`) }],
    }),
    component: PlanoCentroPage,
    errorComponent: ({ error }) => (
      <div className="lotus-surface p-4 text-sm text-danger">
        Não foi possível carregar o plano: {error.message}
      </div>
    ),
  },
);

function PlanoCentroPage() {
  const { cliente, planoId } = Route.useParams();
  const { data: adminCheck } = useQuery({
    queryKey: ["me", "isAdmin"],
    queryFn: () => checkIsAdmin(),
    staleTime: 60_000,
  });

  return (
    <Suspense fallback={<DashboardSkeleton kpiCount={4} />}>
      <PlanoCentroInner planoId={planoId} clienteSlug={cliente} isAdmin={!!adminCheck?.isAdmin} />
    </Suspense>
  );
}

function PlanoCentroInner({
  planoId,
  clienteSlug,
  isAdmin,
}: {
  planoId: string;
  clienteSlug: string;
  isAdmin: boolean;
}) {
  const dashboardFn = useServerFn(getStrategicDashboard);
  const { data: ref } = useSuspenseQuery(clienteRefQuery(clienteSlug));
  const { data } = useSuspenseQuery({
    queryKey: ["strategic-dashboard", planoId],
    queryFn: () => dashboardFn({ data: { id: planoId } }),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <StrategicPlanCentro
      data={data}
      planoId={planoId}
      clienteNome={ref?.nome ?? data.plano.cliente_nome}
      isAdmin={isAdmin}
    />
  );
}
