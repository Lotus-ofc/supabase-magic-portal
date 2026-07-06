import { createFileRoute, notFound } from "@tanstack/react-router";
import { brandTitle } from "@/lib/brand";
import { TutorialDocViewer } from "@/components/platform-tutorial/TutorialDocViewer";
import { getTutorialDoc } from "@/lib/platform-tutorial";

export const Route = createFileRoute("/_authenticated/tutorial/$")({
  head: ({ loaderData }) => ({
    meta: [
      {
        title: brandTitle(
          (loaderData as { doc?: { title?: string } } | undefined)?.doc?.title ?? "Capítulo",
        ),
      },
    ],
  }),
  loader: async ({ params }) => {
    const splat = params._splat?.replace(/^\/+|\/+$/g, "") ?? "";
    const slug = `client/${splat}`;
    const doc = await getTutorialDoc(slug);
    if (!doc) throw notFound();
    return { doc };
  },
  component: ClientTutorialDocPage,
});

function ClientTutorialDocPage() {
  const { doc } = Route.useLoaderData();
  return <TutorialDocViewer doc={doc} audience="client" />;
}
