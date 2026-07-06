import type { DocEntry } from "@/lib/knowledge-center/types";
import { parseChangelogMarkdown } from "../extractors/changelog-parser";
import type { GitCommit } from "../types";

export function buildChangelog(docs: Map<string, DocEntry>, recentCommits: GitCommit[] = []) {
  const doc = docs.get("12-changelog/changelog");
  if (!doc) {
    return { unreleased: [], recentReleases: [], recentCommits };
  }
  return parseChangelogMarkdown(doc.body, recentCommits);
}
