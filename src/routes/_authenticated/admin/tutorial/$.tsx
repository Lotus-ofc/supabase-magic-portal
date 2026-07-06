import { createFileRoute, notFound } from "@tanstack/react-router";
import { adminTitle } from "@/lib/brand";
import { TutorialDocViewer } from "@/components/platform-tutorial/TutorialDocViewer";
import { getTutorialDoc } from "@/lib/platform-tutorial";

export const Route = createFileRoute("/_authenticated/admin/tutorial/$")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: adminTitle(
          (loaderData as { doc?: { title?: string } } | undefined)?.doc?.title ?? "Capítulo",
        ),
      },
    ],
  }),
  loader: async ({ params }) => {
    const splat = params._splat?.replace(/^\/+|\/+$/g, "") ?? "";
    const slug = `admin/${splat}`;
    const doc = await getTutorialDoc(slug);
    if (!doc) throw notFound();
    return { doc };
  },
  component: AdminTutorialDocPage,
});

function AdminTutorialDocPage() {
  const { doc } = Route.useLoaderData();
  return <TutorialDocViewer doc={doc} audience="admin" />;
}
