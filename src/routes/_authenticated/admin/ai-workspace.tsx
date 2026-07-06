import { createFileRoute, redirect } from "@tanstack/react-router";
import { adminTitle } from "@/lib/brand";
import { isPlatformOwnerEmail } from "@/lib/platform-owner";
import { AiWorkspacePage } from "@/components/ai-workspace/AiWorkspacePage";

export const Route = createFileRoute("/_authenticated/admin/ai-workspace")({
  beforeLoad: ({ context }) => {
    if (!isPlatformOwnerEmail(context.user?.email)) {
      throw redirect({ to: "/admin" });
    }
  },
  head: () => ({ meta: [{ title: adminTitle("AI Workspace") }] }),
  component: AiWorkspaceRoute,
});

function AiWorkspaceRoute() {
  return <AiWorkspacePage />;
}
