import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { adminTitle } from "@/lib/brand";
import { BrandbookPage } from "@/components/brandbook/BrandbookPage";

const brandbookSearchSchema = z.object({
  id: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/admin/brandbook")({
  head: () => ({ meta: [{ title: adminTitle("Brand book") }] }),
  validateSearch: brandbookSearchSchema,
  component: AdminBrandbookRoute,
});

function AdminBrandbookRoute() {
  const search = Route.useSearch();
  return <BrandbookPage initialBrandbookId={search.id} />;
}
