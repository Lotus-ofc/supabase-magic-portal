import type { DocEntry } from "@/lib/knowledge-center/types";
import type { DatabaseSnapshot } from "../types";
import { mergeMigrationTables } from "../extractors/migration-parser";
import { firstParagraphs } from "../extractors/markdown-sections";
import { formatDataSourcesMarkdown } from "./data-sources";

const migrationGlob = import.meta.glob("../../../../supabase/migrations-official/*.sql", {
  query: "?raw",
  import: "default",
  eager: false,
}) as Record<string, () => Promise<string>>;

let cachedTables: DatabaseSnapshot | null = null;

export async function buildDatabase(docs: Map<string, DocEntry>): Promise<DatabaseSnapshot> {
  if (cachedTables) return cachedTables;

  const schema = docs.get("04-database/schema");
  const cwSchema = docs.get("04-database/content-workflow-schema");

  const migrationFiles = Object.keys(migrationGlob)
    .map((k) => k.split("/").pop() ?? k)
    .sort();

  const migrations = await Promise.all(
    Object.entries(migrationGlob).map(async ([path, loader]) => ({
      file: path.split("/").pop() ?? path,
      sql: await loader(),
    })),
  );

  const tables = mergeMigrationTables(migrations);

  const summaryParts: string[] = [];
  if (schema) summaryParts.push(firstParagraphs(schema.body, 2));
  if (cwSchema) summaryParts.push(firstParagraphs(cwSchema.body, 1));

  cachedTables = {
    tables,
    migrationFiles,
    summaryMarkdown: [...summaryParts, formatDataSourcesMarkdown()].join("\n\n").slice(0, 1500),
  };

  return cachedTables;
}

export function invalidateDatabaseCache(): void {
  cachedTables = null;
}
