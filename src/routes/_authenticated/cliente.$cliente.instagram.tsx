import { createFileRoute } from "@tanstack/react-router";
import { PlatformPlaceholder } from "@/components/lotus/PlatformPlaceholder";
import { Instagram } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/instagram")({
  component: () => (
    <PlatformPlaceholder
      icon={Instagram}
      title="Instagram"
      description="Métricas detalhadas do Instagram para esta conta."
    />
  ),
});
