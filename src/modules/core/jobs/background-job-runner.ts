import type { BackgroundJob, JobHandler } from "../types/jobs";

let jobIdCounter = 0;

function nextJobId() {
  jobIdCounter += 1;
  return `job-${Date.now()}-${jobIdCounter}`;
}

/** Fila in-process — preparada para cron/queue/workers. */
export class BackgroundJobRunner {
  private handlers = new Map<string, JobHandler>();
  private queue: BackgroundJob[] = [];
  private processing = false;

  register<TPayload>(name: string, handler: JobHandler<TPayload>): void {
    this.handlers.set(name, handler as JobHandler);
  }

  enqueue<TPayload>(
    name: string,
    module: string,
    payload: TPayload,
    opts?: { maxAttempts?: number; delayMs?: number },
  ): BackgroundJob<TPayload> {
    const job: BackgroundJob<TPayload> = {
      id: nextJobId(),
      name,
      module,
      payload,
      status: "pending",
      attempts: 0,
      maxAttempts: opts?.maxAttempts ?? 3,
      scheduledAt: new Date(Date.now() + (opts?.delayMs ?? 0)).toISOString(),
    };
    this.queue.push(job as BackgroundJob);
    void this.tick();
    return job;
  }

  private async tick(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const now = Date.now();
        const idx = this.queue.findIndex(
          (j) => j.status === "pending" && new Date(j.scheduledAt).getTime() <= now,
        );
        if (idx < 0) break;

        const job = this.queue[idx]!;
        const handler = this.handlers.get(job.name);
        if (!handler) {
          job.status = "failed";
          job.error = `No handler for job: ${job.name}`;
          this.queue.splice(idx, 1);
          continue;
        }

        job.status = "running";
        job.attempts += 1;
        job.startedAt = new Date().toISOString();

        try {
          await handler(job);
          job.status = "completed";
          job.completedAt = new Date().toISOString();
          this.queue.splice(idx, 1);
        } catch (e) {
          job.error = e instanceof Error ? e.message : "Job failed";
          if (job.attempts >= job.maxAttempts) {
            job.status = "failed";
            this.queue.splice(idx, 1);
          } else {
            job.status = "pending";
            job.scheduledAt = new Date(Date.now() + 1000 * job.attempts).toISOString();
          }
        }
      }
    } finally {
      this.processing = false;
    }
  }

  pendingCount(): number {
    return this.queue.filter((j) => j.status === "pending").length;
  }
}

export const backgroundJobRunner = new BackgroundJobRunner();
