import type { AuditEntry } from "../types/audit";

type AuditSink = (entry: AuditEntry) => void | Promise<void>;

let idCounter = 0;

function nextAuditId() {
  idCounter += 1;
  return `audit-${Date.now()}-${idCounter}`;
}

/** Logger de auditoria — sinks plugáveis (memória + DB). */
export class AuditLogger {
  private sinks: AuditSink[] = [];
  private memoryLog: AuditEntry[] = [];

  addSink(sink: AuditSink): () => void {
    this.sinks.push(sink);
    return () => {
      const idx = this.sinks.indexOf(sink);
      if (idx >= 0) this.sinks.splice(idx, 1);
    };
  }

  async log(partial: Omit<AuditEntry, "id" | "createdAt">): Promise<AuditEntry> {
    const entry: AuditEntry = {
      ...partial,
      id: nextAuditId(),
      createdAt: new Date().toISOString(),
    };
    this.memoryLog.unshift(entry);
    if (this.memoryLog.length > 500) this.memoryLog.pop();

    await Promise.all(
      this.sinks.map(async (sink) => {
        try {
          await sink(entry);
        } catch (e) {
          console.error("[AuditLogger] sink error:", e);
        }
      }),
    );

    return entry;
  }

  getRecent(limit = 50): AuditEntry[] {
    return this.memoryLog.slice(0, limit);
  }
}

export const auditLogger = new AuditLogger();
