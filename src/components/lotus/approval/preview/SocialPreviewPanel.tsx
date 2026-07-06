import { MediaPreview } from "@/components/lotus/MediaPreview/MediaPreview";
import type { MediaPreviewContext } from "@/lib/media-preview";
import { cn } from "@/lib/utils";

export function SocialPreviewPanel({
  context,
  className,
}: {
  context: MediaPreviewContext;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/80 bg-card", className)}>
      <MediaPreview context={context} interactive className="border-0" />
    </div>
  );
}
