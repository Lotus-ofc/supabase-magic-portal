import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Settings2 } from "lucide-react";
import type { StrategicDashboardPayload } from "@/lib/strategic-plan/types";
import { PageHeader } from "@/components/lotus/PageHeader";
import { Button } from "@/components/ui/button";
import { DiagnosticoAtualBlock } from "./DiagnosticoAtualBlock";
import { StrategicRadarChart } from "./StrategicRadarChart";
import { ObjetivosSection } from "./ObjetivosSection";
import { HipotesesFlow } from "./HipotesesFlow";
import { EstrategiasSection } from "./EstrategiasSection";
import { OportunidadesSection } from "./OportunidadesSection";
import { RoadmapTimeline } from "./RoadmapTimeline";
import { DecisoesPanel } from "./DecisoesPanel";
import { AprendizadosTimeline } from "./AprendizadosTimeline";
import { KpisAlertsSection, PlanoTimelineSection } from "./KpisAlertsSection";
import { ProximosPassosBlock } from "./ProximosPassosBlock";
import { StrategicPlanManageDrawer } from "./StrategicPlanManageDrawer";
import { addPlanoComment } from "@/lib/strategic-plan.functions";
import type { ReactNode } from "react";

interface StrategicPlanCentroProps {
  data: StrategicDashboardPayload;
  planoId: string;
  isAdmin?: boolean;
  backLink?: ReactNode;
}

export function StrategicPlanCentro({
  data,
  planoId,
  isAdmin,
  backLink,
}: StrategicPlanCentroProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const qc = useQueryClient();
  const addCommentFn = useServerFn(addPlanoComment);
  const commentMut = useMutation({
    mutationFn: (mensagem: string) => addCommentFn({ data: { plano_id: planoId, mensagem } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["strategic-dashboard", planoId] });
    },
  });

  const periodoLabel = `${new Date(data.plano.periodo_inicio + "T12:00:00").toLocaleDateString("pt-BR")} — ${new Date(data.plano.periodo_fim + "T12:00:00").toLocaleDateString("pt-BR")}`;

  return (
    <div className="space-y-6 pb-10">
      {backLink}
      <PageHeader
        eyebrow="Centro Estratégico"
        title={data.plano.titulo}
        description={
          data.plano.objetivo_principal
            ? `${data.plano.objetivo_principal} · ${periodoLabel}`
            : periodoLabel
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setManageOpen(true)}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Gerenciar
          </Button>
        }
      />

      <DiagnosticoAtualBlock insights={data.diagnostico} />
      <StrategicRadarChart axes={data.radar} />
      <ObjetivosSection objetivos={data.objetivos} />
      <HipotesesFlow hipoteses={data.hipoteses} />
      <EstrategiasSection estrategias={data.estrategias} isAdmin={isAdmin} />
      <OportunidadesSection oportunidades={data.oportunidades} />
      <RoadmapTimeline marcos={data.roadmap} />
      <DecisoesPanel decisoes={data.decisoes} />
      <AprendizadosTimeline aprendizados={data.aprendizados} />
      <KpisAlertsSection alerts={data.alerts} metricCount={data.metricProgress.length} />
      <PlanoTimelineSection eventos={data.eventos} />
      <ProximosPassosBlock passos={data.proximosPassos} />

      <StrategicPlanManageDrawer
        open={manageOpen}
        onOpenChange={setManageOpen}
        planoId={planoId}
        plano={data.plano}
        estrategias={data.estrategias}
        onComment={(msg) => commentMut.mutate(msg)}
      />
    </div>
  );
}
