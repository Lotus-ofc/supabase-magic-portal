/** Extrai seções e listas de markdown — reutilizado pelos sources. */

export function extractSection(body: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^#{1,3}\\s+${escaped}\\s*$`, "im");
  const match = re.exec(body);
  if (!match) return "";

  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const nextHeading = rest.search(/^#{1,3}\s+/m);
  return (nextHeading === -1 ? rest : rest.slice(0, nextHeading)).trim();
}

export function extractBulletList(text: string, limit = 20): string[] {
  const items: string[] = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^[\s>*-]*[-*]\s+(.+)$/);
    if (m) {
      items.push(
        m[1]
          .replace(/\*\*/g, "")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .trim(),
      );
    }
  }
  return items.slice(0, limit);
}

export function stripMarkdownInline(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function firstParagraphs(body: string, count = 2): string {
  const lines = body.split("\n");
  const paragraphs: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t === "---" || t.startsWith("```") || t.startsWith("|")) {
      if (current.length) {
        paragraphs.push(current.join(" "));
        current = [];
        if (paragraphs.length >= count) break;
      }
      continue;
    }
    if (t.startsWith(">")) {
      current.push(t.replace(/^>\s*/, ""));
      continue;
    }
    current.push(t);
  }
  if (current.length && paragraphs.length < count) paragraphs.push(current.join(" "));
  return paragraphs.map(stripMarkdownInline).join("\n\n").slice(0, 1200);
}
