import { createFileRoute } from "@tanstack/react-router";
import { PlatformPlaceholder } from "@/components/lotus/PlatformPlaceholder";
import { Facebook } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/meta-ads")({
  component: () => (
    <PlatformPlaceholder
      icon={Facebook}
      title="Meta Ads"
      description="Campanhas, conjuntos e anúncios da conta Meta Ads."
    />
  ),
});
