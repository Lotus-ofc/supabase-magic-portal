import { differenceInCalendarDays, isThisWeek, isToday, isYesterday, parseISO } from "date-fns";
import type { AgencyTimelineEvent, AgencyTimelineEventType } from "../types";

export type TimelinePeriod = "Hoje" | "Ontem" | "Esta semana" | "Mais antigos";

export interface TimelineGroup {
  period: TimelinePeriod;
  items: TimelineGroupItem[];
}

export interface TimelineGroupItem {
  kind: "single" | "aggregate";
  event?: AgencyTimelineEvent;
  aggregateLabel?: string;
  aggregateCount?: number;
  latestAt: string;
}

const AGGREGATABLE: Partial<Record<AgencyTimelineEventType, string>> = {
  task_completed: "tarefas concluídas",
  note_added: "observações adicionadas",
  task_created: "tarefas criadas",
  project_created: "projetos criados",
};

function periodFor(iso: string, now = new Date()): TimelinePeriod {
  const d = parseISO(iso);
  if (isToday(d)) return "Hoje";
  if (isYesterday(d)) return "Ontem";
  if (isThisWeek(d, { weekStartsOn: 1 })) return "Esta semana";
  return "Mais antigos";
}

function aggregateEvents(events: AgencyTimelineEvent[]): TimelineGroupItem[] {
  const singles: TimelineGroupItem[] = [];
  const buckets = new Map<AgencyTimelineEventType, AgencyTimelineEvent[]>();

  for (const event of events) {
    const label = AGGREGATABLE[event.event_type];
    if (label) {
      const list = buckets.get(event.event_type) ?? [];
      list.push(event);
      buckets.set(event.event_type, list);
    } else {
      singles.push({ kind: "single", event, latestAt: event.created_at });
    }
  }

  for (const [, group] of buckets) {
    if (group.length >= 3) {
      const label = AGGREGATABLE[group[0]!.event_type]!;
      singles.push({
        kind: "aggregate",
        aggregateLabel: label,
        aggregateCount: group.length,
        latestAt: group[0]!.created_at,
      });
    } else {
      for (const event of group) {
        singles.push({ kind: "single", event, latestAt: event.created_at });
      }
    }
  }

  return singles.sort((a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime());
}

export function groupTimelineEvents(
  events: AgencyTimelineEvent[],
  now = new Date(),
): TimelineGroup[] {
  const byPeriod = new Map<TimelinePeriod, AgencyTimelineEvent[]>();
  const order: TimelinePeriod[] = ["Hoje", "Ontem", "Esta semana", "Mais antigos"];

  for (const event of events) {
    const p = periodFor(event.created_at, now);
    const list = byPeriod.get(p) ?? [];
    list.push(event);
    byPeriod.set(p, list);
  }

  return order
    .filter((p) => byPeriod.has(p))
    .map((period) => ({
      period,
      items: aggregateEvents(
        (byPeriod.get(period) ?? []).sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      ),
    }));
}

export function checklistProgress(checklist: unknown): number {
  if (!Array.isArray(checklist) || checklist.length === 0) return 0;
  const done = checklist.filter(
    (item) =>
      typeof item === "object" && item && "done" in item && (item as { done: boolean }).done,
  ).length;
  return Math.round((done / checklist.length) * 100);
}
