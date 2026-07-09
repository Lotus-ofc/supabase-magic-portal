import { InMemoryWriteAuditRepository } from "./audit/in-memory-write-audit.repository";
import { InMemoryReplayEnvelopeStore } from "./replay/in-memory-replay-envelope-store";
import { MetricPipeline } from "./metric-pipeline";
import { ReplayService } from "./replay/replay.service";
import type { MetricWriterPort } from "./ports";
import {
  createMetricWriterRegistry,
  type CreateMetricWriterRegistryOptions,
  type MetricWriterRegistry,
} from "./writers/writer-registry";
import { createSupabaseBaseMetricasWriter } from "@/modules/platform-hub-bridges/base-metricas";
import { isSupabaseWriterEnabled } from "./writers/writer-config";
import type { WriterMode } from "./writers/writer-config";

export interface CreateMetricPipelineStackOptions extends CreateMetricWriterRegistryOptions {
  writers?: readonly MetricWriterPort[];
  writerMode?: WriterMode;
  auditRepository?: InMemoryWriteAuditRepository;
  replayStore?: InMemoryReplayEnvelopeStore;
}

function resolveWriters(options: CreateMetricPipelineStackOptions): MetricWriterRegistry {
  if (options.writers && options.writers.length > 0) {
    return createMetricWriterRegistry({
      writers: options.writers,
      memoryWriter: options.memoryWriter,
    });
  }

  const mode = options.writerMode ?? options.mode ?? "memory";
  const supabaseEnabled = isSupabaseWriterEnabled(options.supabaseWriterEnabled);

  const supabaseWriter =
    options.supabaseWriter ??
    (mode === "supabase" || mode === "both"
      ? createSupabaseBaseMetricasWriter({ enabled: supabaseEnabled })
      : undefined);

  return createMetricWriterRegistry({
    mode,
    memoryWriter: options.memoryWriter,
    supabaseWriter,
    supabaseWriterEnabled: supabaseEnabled,
  });
}

/** Factory — MetricPipeline + Writer registry (memory / supabase / dual-run). */
export function createMetricPipelineStack(options: CreateMetricPipelineStackOptions = {}) {
  const { writers, memoryWriter } = resolveWriters(options);
  const auditRepository = options.auditRepository ?? new InMemoryWriteAuditRepository();
  const replayStore = options.replayStore ?? new InMemoryReplayEnvelopeStore();

  const metricPipeline = new MetricPipeline(writers, auditRepository, replayStore);
  const replayService = new ReplayService(metricPipeline, replayStore);

  return {
    writers,
    writer: memoryWriter,
    memoryWriter,
    auditRepository,
    replayStore,
    metricPipeline,
    replayService,
  };
}
