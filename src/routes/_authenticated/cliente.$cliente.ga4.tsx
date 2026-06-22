import { createFileRoute } from "@tanstack/react-router";
import { PlatformPlaceholder } from "@/components/lotus/PlatformPlaceholder";
import { BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/ga4")({
  component: () => (
    <PlatformPlaceholder
      icon={BarChart3}
      title="Google Analytics 4"
      description="Sessões, conversões e canais de aquisição do GA4."
    />
  ),
});
