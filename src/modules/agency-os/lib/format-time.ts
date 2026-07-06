import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export function formatDueLabel(iso: string | null | undefined, now = new Date()) {
  if (!iso) return null;
  const date = parseISO(iso.length === 10 ? `${iso}T12:00:00` : iso);
  const days = differenceInCalendarDays(date, now);
  if (days < 0) return `${Math.abs(days)}d atrasado`;
  if (days === 0) return "Hoje";
  if (days === 1) return "Amanhã";
  if (days <= 7) return `${days}d restantes`;
  return format(date, "d MMM", { locale: ptBR });
}

export function isOverdue(iso: string | null | undefined, now = new Date()) {
  if (!iso) return false;
  const date = parseISO(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return differenceInCalendarDays(date, now) < 0;
}

export function daysUntil(iso: string | null | undefined, now = new Date()) {
  if (!iso) return null;
  const date = parseISO(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return differenceInCalendarDays(date, now);
}
