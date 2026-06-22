import { createFileRoute } from "@tanstack/react-router";
import { PlatformPlaceholder } from "@/components/lotus/PlatformPlaceholder";
import { Megaphone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cliente/$cliente/google-ads")({
  component: () => (
    <PlatformPlaceholder
      icon={Megaphone}
      title="Google Ads"
      description="Campanhas, grupos e anúncios da conta Google Ads."
    />
  ),
});
