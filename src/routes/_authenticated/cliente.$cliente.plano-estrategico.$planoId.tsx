import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { Suspense } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getStrategicDashboard } from "@/lib/strategic-plan.functions";
import { checkIsAdmin } from "@/lib/admin.functions";
import { StrategicPlanCentro } from "@/components/lotus/strategic-plan/StrategicPlanCentro";
import { DashboardSkeleton } from "@/components/lotus/DashboardSkeleton";
import { brandTitle } from "@/lib/brand";
import type { StrategicDashboardPayload } from "@/lib/strategic-plan/types";

const dashboardQuery = (planoId: string) =>
  queryOptions({
    queryKey: ["strategic-dashboard", planoId],
    queryFn: async (): Promise<StrategicDashboardPayload> => {
      return getStrategicDashboard({ data: { id: planoId } });
    },
    staleTime: 5 * 60 * 1000,
  });

export const Route = createFileRoute("/_authenticated/cliente/$cliente/plano-estrategico/$planoId")(
  {
    head: ({ params }) => ({
      meta: [{ title: brandTitle(`Centro Estratégico · ${params.cliente}`) }],
    }),
    loader: ({ params, context }) => {
      void context.queryClient.ensureQueryData(dashboardQuery(params.planoId));
    },
    component: PlanoCentroPage,
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
  const { data } = useSuspenseQuery(dashboardQuery(planoId));

  return (
    <StrategicPlanCentro
      data={data}
      planoId={planoId}
      isAdmin={isAdmin}
      backLink={
        <Link
          to="/cliente/$cliente/plano-estrategico"
          params={{ cliente: clienteSlug }}
          className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Todos os planos
        </Link>
      }
    />
  );
}
