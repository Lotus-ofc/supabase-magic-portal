import { createFileRoute } from "@tanstack/react-router";
import { KnowledgeHome } from "@/components/knowledge-center/KnowledgeHome";

export const Route = createFileRoute("/_authenticated/admin/knowledge/")({
  component: KnowledgeIndexPage,
});

function KnowledgeIndexPage() {
  return <KnowledgeHome />;
}
