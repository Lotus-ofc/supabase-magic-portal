import { createFileRoute } from "@tanstack/react-router";
import { adminTitle } from "@/lib/brand";
import { TutorialHome } from "@/components/platform-tutorial/TutorialHome";

export const Route = createFileRoute("/_authenticated/admin/tutorial/")({
  head: () => ({ meta: [{ title: adminTitle("Tutorial da plataforma") }] }),
  component: AdminTutorialHome,
});

function AdminTutorialHome() {
  return <TutorialHome audience="admin" />;
}
