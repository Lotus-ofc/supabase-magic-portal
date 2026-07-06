import { Suspense } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { MiniDashboardCard, priorityTypeIcon } from "../MiniDashboardCard";
import { WorkspaceWidgetShell, WidgetSkeleton } from "./WorkspaceWidgetShell";
import { getClientProjects } from "@/modules/agency-os/agency-os.server";
import { agencyOsKeys } from "@/modules/agency-os/query-keys";
import { checklistProgress } from "@/modules/agency-os/services/group-timeline-events";
import { isOverdue } from "@/modules/agency-os/lib/format-time";
import { PRIORITY_TYPE_META } from "@/modules/agency-os/priority-engine/config/type-meta";

const projectsQuery = (clientId: number) =>
  queryOptions({
    queryKey: agencyOsKeys.clientProjects(clientId),
    queryFn: () => getClientProjects({ data: { id: clientId } }),
  });

export function ProjectsWidget({ clientId }: { clientId: number }) {
  return (
    <Suspense
      fallback={
        <WorkspaceWidgetShell title="Projetos" description="Entregas em andamento">
          <WidgetSkeleton />
        </WorkspaceWidgetShell>
      }
    >
      <ProjectsWidgetContent clientId={clientId} />
    </Suspense>
  );
}

function ProjectsWidgetContent({ clientId }: { clientId: number }) {
  const { data: projects } = useSuspenseQuery(projectsQuery(clientId));
  const active = projects.filter((p) => p.status_kanban !== "finalizado");

  return (
    <WorkspaceWidgetShell title="Projetos" description={`${active.length} em andamento`}>
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum projeto ativo.</p>
      ) : (
        <ul className="space-y-3">
          {active.map((project) => (
            <li key={project.id}>
              <MiniDashboardCard
                compact
                icon={priorityTypeIcon("project")}
                typeLabel={`${PRIORITY_TYPE_META.project.label} · ${project.tipo}`}
                titulo={project.titulo}
                descricao={project.etiqueta}
                prazo={project.prazo}
                prioridade={project.prioridade}
                progress={checklistProgress(project.checklist)}
                updatedAt={project.updated_at}
                overdue={isOverdue(project.prazo)}
              />
            </li>
          ))}
        </ul>
      )}
    </WorkspaceWidgetShell>
  );
}
