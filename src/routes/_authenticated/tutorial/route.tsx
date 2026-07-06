import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TutorialLayout } from "@/components/platform-tutorial/TutorialLayout";
import { brandTitle } from "@/lib/brand";
import { tutorialNavQuery } from "@/lib/platform-tutorial";

export const Route = createFileRoute("/_authenticated/tutorial")({
  head: () => ({ meta: [{ title: brandTitle("Tutorial") }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tutorialNavQuery("client")),
  component: ClientTutorialLayout,
});

function ClientTutorialLayout() {
  return (
    <TutorialLayout audience="client">
      <Outlet />
    </TutorialLayout>
  );
}
