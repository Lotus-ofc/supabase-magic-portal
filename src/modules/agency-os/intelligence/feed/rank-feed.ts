import type { AgencyTimelineEvent } from "../../types";
import type { RankedFeedItem } from "../types";

const CRITICAL_EVENTS = new Set<AgencyTimelineEvent["event_type"]>([
  "payment_overdue",
  "project_completed",
  "lead_converted",
  "contract_signed",
  "landing_published",
  "campaign_paused",
]);

const HIGH_EVENTS = new Set<AgencyTimelineEvent["event_type"]>([
  "task_completed",
  "contract_sent",
  "payment_received",
  "project_created",
  "lead_created",
  "note_added",
]);

function importanceScore(event: AgencyTimelineEvent): number {
  if (CRITICAL_EVENTS.has(event.event_type)) return 95;
  if (HIGH_EVENTS.has(event.event_type)) return 70;
  if (event.event_type === "status_changed") return 50;
  return 40;
}

export function rankFeedEvents(events: AgencyTimelineEvent[], limit = 20): RankedFeedItem[] {
  return [...events]
    .map((event) => ({
      event,
      importance: importanceScore(event),
      critical: CRITICAL_EVENTS.has(event.event_type),
    }))
    .sort((a, b) => {
      if (a.critical !== b.critical) return a.critical ? -1 : 1;
      if (b.importance !== a.importance) return b.importance - a.importance;
      return new Date(b.event.created_at).getTime() - new Date(a.event.created_at).getTime();
    })
    .slice(0, limit);
}
