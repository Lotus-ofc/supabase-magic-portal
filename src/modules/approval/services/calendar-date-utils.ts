export type CalendarView = "month" | "week" | "day";

export function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function buildMonthDays(cursor: Date): Date[] {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startWeekday = first.getDay();
  const start = new Date(first);
  start.setDate(first.getDate() - startWeekday);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export function buildWeekDays(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay());
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

export function resolveCalendarRange(
  view: CalendarView,
  anchorIso: string,
): { from: string; to: string } {
  const anchor = parseIsoDay(anchorIso);
  if (view === "day") {
    return { from: anchorIso, to: anchorIso };
  }
  if (view === "week") {
    const days = buildWeekDays(anchor);
    return { from: isoDay(days[0]!), to: isoDay(days[6]!) };
  }
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

/** Segunda-feira da semana ISO (para story plan). */
export function mondayOfWeek(anchorIso: string): string {
  const d = parseIsoDay(anchorIso);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return isoDay(d);
}

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

export const STORY_DAY_LABELS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
] as const;

/** story_plan_rows.dia_semana: 0=Seg … 6=Dom */
export function storyDiaFromDate(iso: string): number {
  const js = parseIsoDay(iso).getDay();
  return js === 0 ? 6 : js - 1;
}

export function dateForStoryDia(semanaInicio: string, diaSemana: number): string {
  const monday = parseIsoDay(semanaInicio);
  const d = new Date(monday);
  d.setDate(monday.getDate() + diaSemana);
  return isoDay(d);
}
