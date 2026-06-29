import { createFileRoute } from "@tanstack/react-router";
import { adminTitle } from "@/lib/brand";
import { KnowledgeHome } from "@/components/knowledge-center/KnowledgeHome";

export const Route = createFileRoute("/_authenticated/admin/knowledge/")({
  head: () => ({ meta: [{ title: adminTitle("Knowledge Center") }] }),
  component: KnowledgeIndexPage,
});

function KnowledgeIndexPage() {
  return <KnowledgeHome />;
}
