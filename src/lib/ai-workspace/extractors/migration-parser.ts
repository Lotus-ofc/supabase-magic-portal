import type { DatabaseTable } from "../types";

const CREATE_TABLE_RE = /CREATE TABLE(?: IF NOT EXISTS)?\s+(?:public\.)?(\w+)/gi;
const FK_RE = /FOREIGN KEY\s*\([^)]+\)\s*REFERENCES\s+(?:public\.)?(\w+)\s*\([^)]+\)/gi;
const FK_INLINE_RE = /REFERENCES\s+(?:public\.)?(\w+)\s*\([^)]+\)/gi;

export function parseMigrationSql(filename: string, sql: string): DatabaseTable[] {
  const tables: DatabaseTable[] = [];
  const tableMatches = [...sql.matchAll(CREATE_TABLE_RE)];

  for (const match of tableMatches) {
    const name = match[1];
    const start = match.index ?? 0;
    const chunk = sql.slice(start, start + 4000);
    const fks = new Set<string>();

    for (const fkMatch of chunk.matchAll(FK_RE)) fks.add(fkMatch[1]);
    for (const fkMatch of chunk.matchAll(FK_INLINE_RE)) fks.add(fkMatch[1]);

    tables.push({
      name,
      migration: filename,
      foreignKeys: [...fks].filter((fk) => fk !== name),
    });
  }

  return tables;
}

export function mergeMigrationTables(
  migrations: Array<{ file: string; sql: string }>,
): DatabaseTable[] {
  const byName = new Map<string, DatabaseTable>();

  for (const { file, sql } of migrations) {
    for (const table of parseMigrationSql(file, sql)) {
      const existing = byName.get(table.name);
      if (existing) {
        existing.migration = table.migration;
        existing.foreignKeys = [...new Set([...existing.foreignKeys, ...table.foreignKeys])];
      } else {
        byName.set(table.name, table);
      }
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
