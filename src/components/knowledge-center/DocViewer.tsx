import type { DocEntry } from "@/lib/knowledge-center";
import { KnowledgeBreadcrumb } from "./KnowledgeBreadcrumb";
import { KnowledgeDocMeta } from "./KnowledgeDocMeta";
import { KnowledgeMarkdown } from "./KnowledgeMarkdown";
import { KnowledgeToc } from "./KnowledgeToc";
import { FavoriteButton } from "./FavoriteButton";

interface DocViewerProps {
  doc: DocEntry;
}

export function DocViewer({ doc }: DocViewerProps) {
  return (
    <div className="relative">
      <div className="mb-2 flex items-start justify-between gap-3">
        <KnowledgeBreadcrumb slug={doc.slug} />
        <FavoriteButton slug={doc.slug} className="shrink-0" />
      </div>

      <div className="flex gap-10">
        <article className="min-w-0 flex-1">
          <KnowledgeDocMeta doc={doc} />
          <KnowledgeMarkdown content={doc.body} currentDocPath={doc.path} />
        </article>

        <aside className="hidden w-48 shrink-0 xl:block">
          <div className="sticky top-6">
            <KnowledgeToc items={doc.toc} />
          </div>
        </aside>
      </div>
    </div>
  );
}
