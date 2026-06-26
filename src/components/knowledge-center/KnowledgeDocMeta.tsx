import type { DocEntry } from "@/lib/knowledge-center";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Gauge } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  living: "Vivo",
  draft: "Rascunho",
  deprecated: "Descontinuado",
  archived: "Arquivado",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

interface KnowledgeDocMetaProps {
  doc: DocEntry;
}

export function KnowledgeDocMeta({ doc }: KnowledgeDocMetaProps) {
  const { frontmatter } = doc;
  const author = frontmatter.author ?? frontmatter.owner;
  const updated = frontmatter.updated ?? frontmatter.last_review ?? frontmatter.created;
  const status = frontmatter.status;
  const difficulty = frontmatter.difficulty;
  const tags = frontmatter.tags ?? [];

  return (
    <div className="mb-6 space-y-3 border-b border-border pb-5">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]">
          {doc.title}
        </h1>
        {doc.description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {doc.description}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        {author && (
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {author}
          </span>
        )}
        {updated && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Atualizado {updated}
          </span>
        )}
        {status && (
          <Badge variant="secondary" className="text-[10.5px] font-medium">
            {STATUS_LABELS[status] ?? status}
          </Badge>
        )}
        {difficulty && (
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5" />
            {DIFFICULTY_LABELS[difficulty] ?? difficulty}
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10.5px]">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
