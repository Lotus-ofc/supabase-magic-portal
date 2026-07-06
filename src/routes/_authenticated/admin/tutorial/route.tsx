import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TutorialLayout } from "@/components/platform-tutorial/TutorialLayout";
import { adminTitle } from "@/lib/brand";
import { tutorialNavQuery } from "@/lib/platform-tutorial";

export const Route = createFileRoute("/_authenticated/admin/tutorial")({
  head: () => ({ meta: [{ title: adminTitle("Tutorial") }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tutorialNavQuery("admin")),
  component: AdminTutorialLayout,
});

function AdminTutorialLayout() {
  return (
    <TutorialLayout audience="admin">
      <Outlet />
    </TutorialLayout>
  );
}
