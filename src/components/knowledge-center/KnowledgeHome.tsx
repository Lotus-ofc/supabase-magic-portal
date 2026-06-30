import { Link } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { BookOpen, Clock, Star } from "lucide-react";
import { getDocsBySlugs } from "@/lib/knowledge-center";
import { getFavorites, getRecent } from "@/lib/knowledge-center/storage";

export function KnowledgeHome() {
  const favorites = getDocsBySlugs(getFavorites());
  const recent = getDocsBySlugs(getRecent()).filter((d) => d.slug !== "start-here");

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-2">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card to-secondary/5 p-6 sm:p-8">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary-600 dark:text-primary-300">
          <BookOpen className="h-5 w-5" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Knowledge Center</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Centro de conhecimento integrado do {BRAND_NAME} — arquitetura, engenharia, produto,
          operações e dashboards. Markdown em{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">docs/</code> é a fonte única de
          verdade; novos arquivos aparecem automaticamente aqui.
        </p>
        <Link
          to="/admin/knowledge/$"
          params={{ _splat: "start-here" }}
          className="lotus-focus mt-5 inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Começar por START HERE
        </Link>
      </div>

      {favorites.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4 text-primary-500" />
            Favoritos
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {favorites.map((doc) => (
              <li key={doc.slug}>
                <Link
                  to="/admin/knowledge/$"
                  params={{ _splat: doc.slug }}
                  className="block rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary-300"
                >
                  <p className="text-sm font-medium">{doc.title}</p>
                  {doc.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {doc.description}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Acessados recentemente
          </h2>
          <ul className="space-y-1">
            {recent.map((doc) => (
              <li key={doc.slug}>
                <Link
                  to="/admin/knowledge/$"
                  params={{ _splat: doc.slug }}
                  className="flex items-center justify-between rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span>{doc.title}</span>
                  <span className="text-xs text-muted-foreground">{doc.path}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
