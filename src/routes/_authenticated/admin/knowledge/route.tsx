import { createFileRoute, Outlet } from "@tanstack/react-router";
import { KnowledgeLayout } from "@/components/knowledge-center/KnowledgeLayout";
import { adminTitle } from "@/lib/brand";
import { kcNavQuery } from "@/lib/knowledge-center/registry";

export const Route = createFileRoute("/_authenticated/admin/knowledge")({
  head: () => ({ meta: [{ title: adminTitle("Knowledge Center") }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(kcNavQuery),
  component: KnowledgeRouteLayout,
});

function KnowledgeRouteLayout() {
  return (
    <KnowledgeLayout>
      <Outlet />
    </KnowledgeLayout>
  );
}
