import { createFileRoute } from "@tanstack/react-router";
import { PlatformPlaceholder } from "@/components/lotus/PlatformPlaceholder";
import { Globe } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/google-business")({
  component: () => (
    <PlatformPlaceholder
      icon={Globe}
      title="Google Business"
      description="Visualizações, buscas e ações do perfil Google Business."
    />
  ),
});
