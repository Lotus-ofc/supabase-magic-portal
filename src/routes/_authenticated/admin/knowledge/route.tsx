import { createFileRoute, Outlet } from "@tanstack/react-router";
import { KnowledgeLayout } from "@/components/knowledge-center/KnowledgeLayout";

export const Route = createFileRoute("/_authenticated/admin/knowledge")({
  component: KnowledgeRouteLayout,
});

function KnowledgeRouteLayout() {
  return (
    <KnowledgeLayout>
      <Outlet />
    </KnowledgeLayout>
  );
}
