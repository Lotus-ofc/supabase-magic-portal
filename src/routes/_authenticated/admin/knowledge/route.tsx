import { createFileRoute, Outlet } from "@tanstack/react-router";
import { KnowledgeLayout } from "@/components/knowledge-center/KnowledgeLayout";
import { adminTitle } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin/knowledge")({
  head: () => ({ meta: [{ title: adminTitle("Knowledge Center") }] }),
  component: KnowledgeRouteLayout,
});

function KnowledgeRouteLayout() {
  return (
    <KnowledgeLayout>
      <Outlet />
    </KnowledgeLayout>
  );
}
