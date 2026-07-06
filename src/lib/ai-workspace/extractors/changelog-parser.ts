import type { ChangelogRelease, ChangelogSnapshot, GitCommit } from "../types";

function cleanBullet(line: string): string {
  return line
    .replace(/^[\s-]+/, "")
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

export function parseChangelogMarkdown(
  body: string,
  recentCommits: GitCommit[] = [],
): ChangelogSnapshot {
  const unreleased: string[] = [];
  const recentReleases: ChangelogRelease[] = [];
  let currentRelease: ChangelogRelease | null = null;
  let inUnreleased = false;

  for (const line of body.split("\n")) {
    const releaseMatch = line.match(/^##\s+\[(.+?)\](?:\s+-\s+(\d{4}-\d{2}-\d{2}))?/);
    if (releaseMatch) {
      if (currentRelease) recentReleases.push(currentRelease);
      const version = releaseMatch[1];
      inUnreleased = /não lançado|unreleased/i.test(version);
      currentRelease = { version, date: releaseMatch[2], items: [] };
      continue;
    }

    const bullet = line.match(/^-\s+(.+)/);
    if (!bullet) continue;

    const item = cleanBullet(bullet[1]);
    if (!item) continue;

    if (inUnreleased) unreleased.push(item);
    else if (currentRelease) currentRelease.items.push(item);
  }
  if (currentRelease) recentReleases.push(currentRelease);

  return {
    unreleased,
    recentReleases: recentReleases
      .filter((r) => !/não lançado|unreleased/i.test(r.version))
      .slice(0, 5),
    recentCommits,
  };
}
