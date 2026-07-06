import type { DocEntry } from "@/lib/knowledge-center/types";
import type { OverviewSnapshot } from "../types";
import {
  extractBulletList,
  extractSection,
  firstParagraphs,
  stripMarkdownInline,
} from "../extractors/markdown-sections";

const OVERVIEW_SLUGS = ["start-here", "00-company/mission", "01-product/product-overview"];

export function buildOverview(docs: Map<string, DocEntry>): OverviewSnapshot {
  const startHere = docs.get("start-here");
  const mission = docs.get("00-company/mission");
  const product = docs.get("01-product/product-overview");

  const whatSection = startHere
    ? extractSection(startHere.body, "O que é o Lots BI? (5 minutos)")
    : "";
  const summary = startHere
    ? firstParagraphs(whatSection || startHere.body, 3)
    : "Lots BI — portal de performance e operação para agências de marketing.";

  const bullets: string[] = [];
  if (startHere) {
    bullets.push(
      ...extractBulletList(
        extractSection(startHere.body, "Dois estados — leia isto antes de tudo (10 minutos)"),
        4,
      ),
    );
  }
  if (mission)
    bullets.push(stripMarkdownInline(mission.description || firstParagraphs(mission.body, 1)));
  if (product)
    bullets.push(stripMarkdownInline(product.description || firstParagraphs(product.body, 1)));

  return {
    title: "Lots BI — Visão Geral",
    summary,
    bullets: [...new Set(bullets.filter(Boolean))].slice(0, 10),
    sourceSlugs: OVERVIEW_SLUGS.filter((s) => docs.has(s)),
  };
}
