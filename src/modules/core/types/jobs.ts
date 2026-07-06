export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface BackgroundJob<TPayload = Record<string, unknown>> {
  id: string;
  name: string;
  module: string;
  payload: TPayload;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
}

export type JobHandler<TPayload = Record<string, unknown>> = (
  job: BackgroundJob<TPayload>,
) => Promise<void>;
