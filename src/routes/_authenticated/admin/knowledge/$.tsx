import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { adminTitle } from "@/lib/brand";
import { DocViewer } from "@/components/knowledge-center/DocViewer";
import { getDocBySlug } from "@/lib/knowledge-center";
import { trackRecent } from "@/lib/knowledge-center/storage";

export const Route = createFileRoute("/_authenticated/admin/knowledge/$")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: adminTitle(
          (loaderData as { doc?: { title?: string } } | undefined)?.doc?.title ?? "Documento",
        ),
      },
    ],
  }),
  loader: async ({ params }) => {
    const slug = params._splat?.replace(/^\/+|\/+$/g, "") ?? "";
    const doc = await getDocBySlug(slug);
    if (!doc) throw notFound();
    return { doc };
  },
  component: KnowledgeDocPage,
});

function KnowledgeDocPage() {
  const { doc } = Route.useLoaderData();

  useEffect(() => {
    trackRecent(doc.slug);
  }, [doc.slug]);

  return <DocViewer doc={doc} />;
}
