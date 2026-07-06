import type { AgencyPriority } from "../../types";
import { daysUntil } from "../../lib/format-time";
import type { RawPriorityCandidate } from "../types";
import { PRIORITY_TYPE_URGENCY_BASE } from "../config/weights";

export function clientPriorityScore(p: AgencyPriority): number {
  switch (p) {
    case "A":
      return 100;
    case "B":
      return 80;
    case "C":
      return 55;
    case "D":
      return 30;
  }
}

export function computeUrgency(candidate: RawPriorityCandidate, now = new Date()): number {
  const base = PRIORITY_TYPE_URGENCY_BASE[candidate.type] ?? 50;
  const prazo = candidate.prazo;
  if (!prazo) return base * 0.6;

  const days = daysUntil(prazo, now);
  if (days === null) return base;
  if (days < 0) return Math.min(100, base + Math.min(40, Math.abs(days) * 8));
  if (days === 0) return Math.min(100, base + 25);
  if (days === 1) return Math.min(100, base + 15);
  if (days <= 3) return Math.min(100, base + 8);
  if (days <= 7) return base;
  return Math.max(20, base - 10);
}

export function computeImpact(candidate: RawPriorityCandidate): number {
  let impact = 40;
  if (candidate.type === "payment" || candidate.type === "contract") impact = 90;
  else if (candidate.type === "project") impact = 75;
  else if (candidate.type === "lead") impact = 70;
  else if (candidate.type === "task") impact = 55;
  else if (candidate.type === "meeting") impact = 50;

  if (candidate.healthTier === "critical") impact = Math.min(100, impact + 20);
  else if (candidate.healthTier === "attention") impact = Math.min(100, impact + 10);

  return impact;
}

export function computeFinancialImpact(candidate: RawPriorityCandidate): number {
  const mrr = candidate.clientMrr ?? 0;
  const related = candidate.valorRelacionado ?? 0;
  const value = Math.max(mrr, related);
  if (value <= 0) return 20;
  if (value >= 10000) return 100;
  if (value >= 5000) return 85;
  if (value >= 2000) return 70;
  if (value >= 1000) return 55;
  return 40;
}

export function computeDaysOverdueScore(prazo: string | null, now = new Date()): number {
  const days = daysUntil(prazo, now);
  if (days === null || days >= 0) return 0;
  return Math.min(100, Math.abs(days) * 12);
}

export function computeMrrScore(mrr: number | null): number {
  if (!mrr || mrr <= 0) return 25;
  if (mrr >= 8000) return 100;
  if (mrr >= 4000) return 80;
  if (mrr >= 1500) return 60;
  return 40;
}
