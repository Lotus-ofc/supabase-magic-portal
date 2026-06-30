import { describe, expect, it } from "vitest";
import { parseMarkdownFile } from "./parse";
import { filePathToSlug, resolveRelativeDocPath } from "./slug";
import { resolveMarkdownHref } from "./link-resolver";

describe("knowledge-center slug", () => {
  it("maps START_HERE to start-here", () => {
    expect(filePathToSlug("START_HERE.md")).toBe("start-here");
  });

  it("keeps nested paths", () => {
    expect(filePathToSlug("02-architecture/overview.md")).toBe("02-architecture/overview");
  });

  it("resolves relative paths", () => {
    expect(resolveRelativeDocPath("02-architecture/overview", "./adr/README.md")).toBe(
      "02-architecture/adr/README",
    );
    expect(resolveRelativeDocPath("10-onboarding/onboarding", "../00-company/mission.md")).toBe(
      "00-company/mission",
    );
  });
});

describe("knowledge-center parse", () => {
  it("extracts frontmatter and toc", () => {
    const raw = `---
title: Test Doc
description: A test
tags: [api, backend]
status: living
---

# Test Doc

## Section One

Content here.
`;
    const doc = parseMarkdownFile("03-backend/test.md", raw);
    expect(doc.title).toBe("Test Doc");
    expect(doc.description).toBe("A test");
    expect(doc.frontmatter.tags).toEqual(["api", "backend"]);
    expect(doc.toc).toHaveLength(1);
    expect(doc.toc[0].text).toBe("Section One");
  });

  it("parses multiline list frontmatter", () => {
    const raw = `---
title: Related Doc
related:
  - 06-engine/platform-catalog
  - 06-engine/formulas
---

# Related Doc
`;
    const doc = parseMarkdownFile("06-dashboards/platforms/google-ads.md", raw);
    expect(doc.frontmatter.related).toEqual(["06-engine/platform-catalog", "06-engine/formulas"]);
  });
});

describe("knowledge-center link resolver", () => {
  const known = new Set(["start-here", "00-company/mission", "02-architecture/overview"]);

  it("rewrites relative md links", () => {
    expect(resolveMarkdownHref("./mission.md", "00-company/philosophy", known)).toBe(
      "/admin/knowledge/00-company/mission",
    );
  });

  it("preserves external links", () => {
    expect(resolveMarkdownHref("https://example.com", "x", known)).toBe("https://example.com");
  });

  it("preserves hash-only links", () => {
    expect(resolveMarkdownHref("#section", "x", known)).toBe("#section");
  });
});
