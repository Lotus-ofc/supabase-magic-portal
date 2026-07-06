import { createFileRoute } from "@tanstack/react-router";
import { brandTitle } from "@/lib/brand";
import { TutorialHome } from "@/components/platform-tutorial/TutorialHome";

export const Route = createFileRoute("/_authenticated/tutorial/")({
  head: () => ({ meta: [{ title: brandTitle("Tutorial da plataforma") }] }),
  component: ClientTutorialHome,
});

function ClientTutorialHome() {
  return <TutorialHome audience="client" />;
}
