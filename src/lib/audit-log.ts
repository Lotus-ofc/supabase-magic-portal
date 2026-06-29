/** Trilha de auditoria local (sessão) — complementa logs de servidor existentes. */

export type AuditAction =
  | "login"
  | "logout"
  | "aprovacao"
  | "reprovacao"
  | "criacao"
  | "edicao"
  | "remocao"
  | "sync"
  | "navegacao";

export interface AuditEntry {
  id: string;
  action: AuditAction;
  detail: string;
  userEmail?: string;
  origin: string;
  createdAt: string;
}

const STORAGE_KEY = "lots-bi-audit";
const MAX_ITEMS = 120;

function load(): AuditEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: AuditEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

export function listAuditEntries(): AuditEntry[] {
  return load().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function recordAudit(
  input: Omit<AuditEntry, "id" | "createdAt" | "origin"> & {
    origin?: string;
  },
) {
  const entry: AuditEntry = {
    id: crypto.randomUUID(),
    action: input.action,
    detail: input.detail,
    userEmail: input.userEmail,
    origin: input.origin ?? (typeof window !== "undefined" ? window.location.pathname : "app"),
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...load()].slice(0, MAX_ITEMS);
  save(next);
  window.dispatchEvent(new CustomEvent("lots-bi:audit"));
  return entry;
}
